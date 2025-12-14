# Contributing to modal-bridge-constructs

Thank you for your interest in contributing to modal-bridge-constructs! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all experience levels.

## How to Contribute

### Reporting Bugs

1. Check the [existing issues](https://github.com/henrypigg/modal-bridge-constructs/issues) to avoid duplicates
2. Create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs actual behavior
   - Your environment (Node.js version, CDK version, OS)

### Suggesting Features

1. Open an issue describing the feature
2. Explain the use case and why it would be valuable
3. Be open to discussion about implementation approaches

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following our coding standards
4. Write or update tests as needed
5. Ensure all tests pass:
   ```bash
   npm test
   ```
6. Format your code:
   ```bash
   npm run format
   ```
7. Commit with a clear message describing your changes
8. Push to your fork and open a pull request

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/henrypigg/modal-bridge-constructs.git
   cd modal-bridge-constructs/modal-bridge-constructs
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Coding Standards

- Use TypeScript for all source code
- Follow the existing code style (enforced by Prettier)
- Write tests for new functionality
- Keep functions focused and well-documented
- Use meaningful variable and function names

## Testing

- All new features should include tests
- Run the full test suite before submitting a PR
- Aim for meaningful test coverage of edge cases

## Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 72 characters
- Add additional context in the body if needed

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing to this project, you agree that your contributions will be licensed under the Apache License 2.0.
