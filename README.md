# **affirmME**

affirmME is a productivity-focused browser extension designed to motivate users through positive reinforcement. When a user completes a task, the extension sends the task text to a Large Language Model (LLM), which generates a personalized encouraging affirmation in real time.

This project is being developed as an open-source collaborative effort, with a focus on clean UI design, seamless LLM integration, and user-friendly interactions.


## How It Works

1. The user opens the extension and views their task list.
2. The user adds tasks to the checklist.
3. When a task is marked as complete, the task text is sent to an LLM.
4. The LLM generates a personalized affirmation based on the completed task.
5. The affirmation is displayed instantly within the browser extension to encourage continued productivity.

## LLM Integration

affirmME uses a Large Language Model (LLM) to dynamically generate positive affirmations.

Instead of relying on static affirmations or external task-tracking APIs, the extension:
- Sends completed task text as a prompt to an LLM
- Receives a contextual affirmation response
- Displays the affirmation in the extension UI

This allows affirmations to feel:
- Personalized
- Context-aware
- Encouraging and unique

Future improvements may include:
- Adjustable affirmation tone (gentle, energetic, professional, etc.)
- User-customizable prompt styles
- Response length controls

---

## Installation Process

- Fork the repository  
- Clone the repository:
    - git clone "repository-url"
- cd affirmME

## Load the Extension in Your Browser

1. Open Google Chrome and go to: `chrome://extensions`
2. Enable **Developer Mode** (top right corner)
3. Click **Load Unpacked**
4. Select the project directory

The affirmME extension should now appear in your browser.

## Requirements

- Google Chrome
- Git

## Tech Stack

- JavaScript
- HTML/CSS
- Chrome Browser Extension APIs
- Large Language Model (LLM) Integration


## Contributing

We welcome contributions of all kinds:

- **Bug Reports** – [Open an issue](https://github.com/ossd-s26/affirmME/issues)
- **Code Contributions** – Fork, develop, and submit a Pull Request
- **Documentation Improvements** – Help us improve clarity and usability

Please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) document for contribution guidelines.

## License

affirmME is licensed under the [MIT License](License.md)


## Contributors

- Team Yellow
  - Rebecca Boadu
  - Rohit Dayanand
  - Sahiti Kota
  - Jaden Ritchie
