import time
import datetime
from dataclasses import dataclass
import json

import requests
from urllib.parse import urlparse

from hackingBuddyGPT.utils.configurable import configurable, parameter
from hackingBuddyGPT.utils.llm_util import LLM, LLMResult


@configurable("gemini-llm-api", "Google Gemini LLM API")
@dataclass
class GeminiConnection(LLM):
    """
    Google Gemini API connection for HackingBuddyGPT.
    Supports Gemini Pro and other Gemini models through the REST API.
    """

    api_key: str = parameter(desc="Google Gemini API Key", secret=True)
    model: str = parameter(desc="Gemini model name")
    context_size: int = parameter(
        desc="Maximum context size for the model, only used internally for things like trimming to the context size"
    )
    api_url: str = parameter(desc="URL of the Gemini API", default="https://generativelanguage.googleapis.com")
    api_timeout: int = parameter(desc="Timeout for the API request", default=240)
    api_backoff: int = parameter(desc="Backoff time in seconds when running into rate-limits", default=60)
    api_retries: int = parameter(desc="Number of retries when running into rate-limits", default=3)

    def get_response(self, prompt, *, retry: int = 0, **kwargs) -> LLMResult:
        if retry >= self.api_retries:
            raise Exception("Failed to get response from Gemini API")

        if hasattr(prompt, "render"):
            prompt = prompt.render(**kwargs)

        # Gemini API endpoint structure
        api_path = f"/v1beta/models/{self.model}:generateContent"
        url = f"{self.api_url}{api_path}?key={self.api_key}"
        
        headers = {
            "Content-Type": "application/json"
        }

        # Gemini API request format
        data = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 8192,
            }
        }

        try:
            tic = datetime.datetime.now()
            response = requests.post(url, headers=headers, json=data, timeout=self.api_timeout)

            if response.status_code == 429:
                print(f"[Gemini-API-Connector] running into rate-limits, waiting for {self.api_backoff} seconds")
                time.sleep(self.api_backoff)
                return self.get_response(prompt, retry=retry + 1)

            if response.status_code != 200:
                try:
                    error_info = response.json()
                    print(f"Error from Gemini API: {error_info}")
                except:
                    print(f"Error from Gemini API ({response.status_code}): {response.text}")
                raise Exception(f"Error from Gemini API ({response.status_code})")

        except requests.exceptions.ConnectionError:
            print("Connection error! Retrying in 5 seconds..")
            time.sleep(5)
            return self.get_response(prompt, retry=retry + 1)

        except requests.exceptions.Timeout:
            print("Timeout while contacting Gemini REST endpoint")
            return self.get_response(prompt, retry=retry + 1)

        # Extract the response from Gemini API format
        try:
            response_json = response.json()
            
            if "candidates" not in response_json or not response_json["candidates"]:
                raise Exception("No candidates in Gemini response")
            
            candidate = response_json["candidates"][0]
            if "content" not in candidate or "parts" not in candidate["content"]:
                raise Exception("Invalid response format from Gemini")
            
            result = candidate["content"]["parts"][0]["text"]
            
            # Extract token usage if available
            tok_query = 0
            tok_res = 0
            if "usageMetadata" in response_json:
                usage = response_json["usageMetadata"]
                tok_query = usage.get("promptTokenCount", 0)
                tok_res = usage.get("candidatesTokenCount", 0)
            
            duration = datetime.datetime.now() - tic

            return LLMResult(result, prompt, result, duration, tok_query, tok_res)
            
        except Exception as e:
            print(f"Error parsing Gemini response: {e}")
            print(f"Response content: {response.text}")
            raise Exception(f"Error parsing Gemini response: {e}")

    def encode(self, query) -> list[int]:
        # For Gemini models, we'll use a simple approximation
        # In a real implementation, you might want to use the actual Gemini tokenizer
        # For now, we'll use a rough estimate: 1 token ≈ 4 characters for most languages
        return list(range(len(query) // 4))


@configurable("gemini/gemini-pro", "Google Gemini Pro")
@dataclass
class GeminiPro(GeminiConnection):
    model: str = "gemini-pro"
    context_size: int = 30720  # 30K tokens


@configurable("gemini/gemini-1.5-pro", "Google Gemini 1.5 Pro")
@dataclass
class Gemini15Pro(GeminiConnection):
    model: str = "gemini-1.5-pro"
    context_size: int = 2097152  # 2M tokens


@configurable("gemini/gemini-1.5-flash", "Google Gemini 1.5 Flash")
@dataclass
class Gemini15Flash(GeminiConnection):
    model: str = "gemini-1.5-flash"
    context_size: int = 1048576  # 1M tokens
