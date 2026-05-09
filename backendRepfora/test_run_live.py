import google.generativeai as genai
from google.adk.agents.llm_agent import Agent
import os

api_key_real = "AIzaSyDNPOPG3m1dN6WplJwSXUkKZZ4IjEBBxjU"
genai.configure(api_key=api_key_real)
os.environ["GOOGLE_API_KEY"] = api_key_real

root_agent = Agent(
    model='gemini-1.5-pro',
    name='test',
    instruction='Di hola'
)

try:
    response = root_agent.run_live(input="Hola")
    print(f"Response type: {type(response)}")
    print(f"Response content: {response}")
    if hasattr(response, 'text'):
        print(f"Response text: {response.text}")
except Exception as e:
    print(f"Error calling run_live: {e}")
