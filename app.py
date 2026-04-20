print("🔥 NEW CODE RUNNING")

from flask import Flask, request, render_template, Response
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/signup")
def signup():
    return render_template("signup.html")

@app.route("/chat-stream", methods=["POST"])
def chat_stream():
    user_text = request.json["text"]

    print("USER:", user_text)

    try:
        res = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": """You are a coding assistant.
- Give short answers
- No long paragraphs
- If code is asked → return only code
- Use clean formatting
"""
                },
                {
                    "role": "user",
                    "content": user_text
                }
            ],  # ✅ IMPORTANT COMMA
            stream=False
        )

        reply = res.choices[0].message.content
        print("BOT:", reply)

        return reply

    except Exception as e:
        print("ERROR:", e)
        return "Error: " + str(e)

if __name__ == "__main__":
    app.run(debug=True)