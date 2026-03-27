# Apex Automator

**AutoApex** is a Node.js utility to **automatically deploy and run Salesforce Apex classes** from your local machine. It simplifies testing and executing Apex code by combining deployment and execution in a single command.

---

## Features

- Auto-deploy a specific Apex class to your Salesforce org.  
- Detects public static or instance methods and runs them.  
- Displays debug logs (`System.debug`) in a clean, readable format.  
- Works with Salesforce DX (`sf` CLI).  
- Supports passing class names or file paths.

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/AutoApex.git
cd AutoApex
```
2. How to use
```bash
node apex-runner/runApex.js ClassName
```
OR

```bash
node apex-runner/runApex.js path/to/Class.cls
```
