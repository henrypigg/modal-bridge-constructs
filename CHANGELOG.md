# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2025-12-14

### Changed

- Re-wrote modal function handler in TypeScript (previously Python) with improved type safety and testing

## [0.1.0] - 2025-12-13

### Added

- Initial release of modal-bridge-constructs
- `ModalFunction` construct for integrating Modal functions with AWS Lambda
- Support for OIDC authentication between AWS and Modal
- `ModalSecret` construct for managing Modal credentials in AWS Secrets Manager
- Multiple invocation modes:
  - `spawn` - Fire-and-forget async execution
  - `remote` - Synchronous execution with response
- Event source integrations:
  - S3 event triggers
  - SQS queue processing
  - API Gateway integration
  - EventBridge scheduled events
- TypeScript type definitions
- Comprehensive documentation and examples

### Dependencies

- Requires AWS CDK v2.100.0 or higher
- Requires Node.js 18 or higher
- Uses `@aws-cdk/aws-lambda-python-alpha` for Python Lambda runtime

[Unreleased]: https://github.com/henrypigg/modal-bridge-constructs/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/henrypigg/modal-bridge-constructs/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/henrypigg/modal-bridge-constructs/releases/tag/v0.1.0
