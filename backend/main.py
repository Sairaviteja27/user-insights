import os
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import praw
import json
from langchain_openai import AzureChatOpenAI
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

# Load environment variables
load_dotenv()

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

Respond only with a valid JSON object.
"""



prompt = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT),
    HumanMessagePromptTemplate.from_template("Reddit activity:\n\n{input}")
])

# Request body model
class AnalyzeRequest(BaseModel):
    username: str
    limit: int = 10

# Route to analyze Reddit activity
@app.post("/analyze")
def analyze_user(request: AnalyzeRequest):
    try:
        user = reddit.redditor(request.username)
        texts = []

        for submission in user.submissions.new(limit=request.limit):
            texts.append(f"Post: {submission.title}\n{submission.selftext or ''}")

        for comment in user.comments.new(limit=request.limit):
            texts.append(f"Comment: {comment.body}")

        combined_text = "\n\n".join(texts)

        if not combined_text.strip():
            raise HTTPException(status_code=404, detail="No user activity found.")

        chain = prompt | llm
        result = chain.invoke({"input": combined_text})

        # parse JSON returned by GPT
        try:
            parsed = json.loads(result.content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Invalid JSON returned by GPT.")

        return {
            "username": request.username,
            **parsed
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing user: {str(e)}")
