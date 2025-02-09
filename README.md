# PyMiio

PyMiio is a work-in-progress UI for managing and interacting with Miio devices using Tauri and Rust on the backend, and React with TypeScript on the frontend.

## Overview

This application provides the following features:
- **Device Management:** Add, remove, and list devices.
- **Action Control:** Configure and run actions on connected devices.
- **Tauri Integration:** Uses Tauri for a native desktop experience with a Rust backend.

> **Note:** The project is still in early development; many features are not fully implemented.

## Dependencies

This project depends mostly on the following libraries:
- [**rust-py-miio:**](https://github.com/juancabe/rust-py-miio) A Rust library that provides the bindings with the Python library
`python-miio`.
- **tauri:** A Rust library for building desktop applications with web technologies.
- **react:** A JavaScript library for building user interfaces.
- **typescript:** A superset of JavaScript that adds static typing to the language.
