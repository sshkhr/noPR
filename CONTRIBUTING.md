# Contributing to noPR Extension

Thank you for your interest in contributing to the noPR extension! This document provides guidelines and instructions for development and contributions.

## Development Setup

### Prerequisites

- Chrome or compatible browser
- Basic knowledge of JavaScript, HTML, and CSS
- Familiarity with browser extensions

### Local Development Environment

1. Clone the repository
```
git clone https://github.com/yourusername/noPR.git
cd noPR
```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the project folder
   - The extension should now be installed and active

3. Make changes to the code:
   - Edit files in the project directory
   - Reload the extension in Chrome to see your changes (click the refresh icon on the extension card)

### Project Structure

- `manifest.json` - Extension configuration
- `content.js` - Main extension script that adds the filter to GitHub pages
- `icons/` - Extension icons in various sizes
- `screenshots/` - Screenshots for documentation

## Making Contributions

### Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub with the following information:

- Clear description of the issue or feature
- Steps to reproduce (for bugs)
- Expected behavior
- Screenshots if applicable
- Browser version and OS

### Pull Requests

We welcome pull requests! To contribute code:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Test thoroughly on different GitHub repositories
5. Commit your changes (`git commit -am 'Add some feature'`)
6. Push to the branch (`git push origin feature/your-feature-name`)
7. Create a new Pull Request

## License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT License.