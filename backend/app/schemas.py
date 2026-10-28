"""Pydantic models = automatic input validation. Bad input gets a clear 422 error."""
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from . import config

SummaryStyle = Literal["short", "bullets", "detailed"]


class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=config.MAX_MESSAGE_CHARS)

    @field_validator("content")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class ConversationCreate(BaseModel):
    title: str = Field(default="New chat", min_length=1, max_length=80)


class SummarizeTextIn(BaseModel):
    text: str = Field(min_length=50, max_length=60000)
    style: SummaryStyle = "short"

    @field_validator("text")
    @classmethod
    def long_enough(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 50:
            raise ValueError("Please provide at least 50 characters of text to summarize")
        return v


class SummarizeDocIn(BaseModel):
    style: SummaryStyle = "short"
