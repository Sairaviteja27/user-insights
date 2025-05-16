import os
import json
import logging
import re
from typing import Dict
from hashlib import sha256

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from cachetools import TTLCache
import praw

from langchain_openai import AzureChatOpenAI
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("error.log"),
        logging.StreamHandler()
    ]
)

# Initialize FastAPI
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Reddit API client
reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent="reddit-personality-analyzer"
)

# LangChain LLM setup
llm = AzureChatOpenAI(deployment_name="gpt-4o-mini")

SYSTEM_PROMPT = """
You are a psychologist AI assistant. Analyze the user's Reddit activity and return a JSON object with this structure:

{{
  "traits": {{
    "Openness": float (0.0 to 1.0),
    "Conscientiousness": float,
    "Extraversion": float,
    "Agreeableness": float,
    "Neuroticism": float
  }},
  "strengths": [emoji-labeled strengths as strings],
  "summary": string (1-line description)
}}

Use the user's writing style, interests, tone, and emotional cues to infer personality. Do not guess randomly or use defaults.

Respond only with a valid JSON object. Do not include markdown formatting like ```json.
"""

prompt = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT),
    HumanMessagePromptTemplate.from_template("Reddit activity:\n\n{input}")
])

# Cache setup
cache = TTLCache(maxsize=500, ttl=86400)

# Request model
class AnalyzeRequest(BaseModel):
    username: str
    limit: int = 10

def is_safe(text: str) -> bool:
    banned_keywords = ['sex', 'porn', 'nsfw', 'fetish', 'nude', 'xxx', 'horny']
    return not any(word in text.lower() for word in banned_keywords)

@app.post("/analyze")
def analyze_user(request: AnalyzeRequest):
    try:
        cache_key = sha256(request.username.strip().lower().encode()).hexdigest()

        if cache_key in cache:
            logging.info(f"Cache hit for {request.username}")
            return cache[cache_key]

        logging.info(f"Fetching Reddit activity for user: {request.username}")
        user = reddit.redditor(request.username)
        posts = []
        comments = []

        for submission in user.submissions.new(limit=request.limit):
            if not submission.over_18:
                posts.append({
                    "title": submission.title,
                    "selftext": submission.selftext or "",
                    "url": submission.url,
                    "created_utc": submission.created_utc
                })

        for comment in user.comments.new(limit=request.limit):
            if not comment.subreddit.over18:
                comments.append({
                    "body": comment.body,
                    "link_permalink": comment.permalink,
                    "created_utc": comment.created_utc
                })

        # Filter the content further by keyword if needed
        combined_text = "\n\n".join(
            [f"Post: {p['title']}\n{p['selftext']}" for p in posts if is_safe(p['title'] + p['selftext'])] +
            [f"Comment: {c['body']}" for c in comments if is_safe(c['body'])]
        )

        if not combined_text.strip():
            logging.warning(f"No SFW content found for user: {request.username}")
            raise HTTPException(status_code=404, detail="No SFW user activity found.")

        chain = prompt | llm
        try:
            result = chain.invoke({"input": combined_text})
        except Exception as e:
            logging.error(f"OpenAI error for user {request.username}: {str(e)}")
            if "content_filter" in str(e):
                raise HTTPException(
                    status_code=400,
                    detail="OpenAI flagged the content as inappropriate. Try a different user."
                )
            raise

        # Remove markdown-style wrapping if present
        clean_json = re.sub(r"^```(?:json)?|```$", "", result.content.strip(), flags=re.MULTILINE).strip()

        try:
            parsed = json.loads(clean_json)
        except json.JSONDecodeError as e:
            logging.error(f"Invalid JSON from GPT for {request.username}: {result.content}")
            raise HTTPException(status_code=500, detail="Invalid JSON returned by GPT.")

        response = {
            "username": request.username,
            **parsed,
            "posts": posts,
            "comments": comments
        }

        cache[cache_key] = response
        logging.info(f"Analysis completed and cached for user: {request.username}")
        return response

    except HTTPException as e:
        logging.warning(f"Handled error for user {request.username}: {e.detail}")
        raise e
    except Exception as e:
        logging.exception(f"Unhandled error analyzing user {request.username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing user: {str(e)}")
