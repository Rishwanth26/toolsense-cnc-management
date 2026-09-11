# ToolSense — Predictive CNC Intelligence

ToolSense is a web-based CNC operations platform built to help machine-shop teams track cutting-tool life, monitor machine health, manage inventory, and guide operators when attention is required.

🌐 **Live Demo:** https://toolsense-cnc.vercel.app  
💻 **GitHub:** https://github.com/Rishwanth26/toolsense-cnc-management

---

## 🚀 Features

### 📊 Operations Overview

- Monitor CNC machines
- View active tool sessions
- Track tool alerts
- Check overall machine health

### 🛠️ Tool Usage

- Track cutting-tool runtime and remaining life
- Select existing tools and start cutting sessions
- Normal Work and Heavy Work modes
- Configurable continuous-run limits
- Cooling breaks for Heavy Work
- Multiple machines can run independently
- Only actual cutting runtime counts toward tool life

### 🏭 Machine Health

ToolSense monitors major CNC conditions including:

- Spindle load, temperature and vibration
- X, Y and Z axes
- Coolant and lubrication
- Pneumatic and electrical systems
- Machine temperature
- Safety systems
- CNC controller status

Machine conditions can be shown as:

- Normal
- Attention
- Abnormal
- Inspection Required

### 🤖 AI-Assisted Diagnostics

The prototype analyzes simulated machine signals and provides:

**Problem → Probable Cause → Recommended Action → Priority**

Example:

    Problem: High spindle vibration
    Cause: Possible tool wear or tool-holder/runout issue
    Action: Inspect tool and holder; replace if required
    Priority: High

> The current prototype uses simulated machine signals. A production version would connect real CNC controllers and sensors to a backend and AI/ML system.

### 📦 Inventory

Manage:

- Tool ID and type
- Machine assignment
- Maximum and used tool life
- Remaining tool life
- Parts produced
- Storage location
- Replacement history

### 🚨 Alerts

Centralized alerts for tool and machine conditions such as:

- High tool usage
- Low remaining tool life
- High spindle vibration/load
- Coolant issues
- Axis errors
- Machine abnormalities

### 📜 History

Track completed tool sessions, including:

- Tool
- Machine
- Runtime
- Work mode
- Parts produced
- Session status
- Cooling events

---

## 🧠 Architecture

    CNC Machine
         ↓
    Sensors / CNC Controller
         ↓
    Edge / IoT Gateway
         ↓
    Backend API
         ↓
    Machine & Tool Data
         ↓
    AI / ML Diagnostics
         ↓
    ToolSense Dashboard

The current version demonstrates the frontend workflow with simulated machine data.

The planned production architecture supports real-time machine integration, historical data analysis and predictive maintenance.

---

## 🛠️ Tech Stack

**Frontend:** React, JavaScript, Vite, CSS, Lucide React

**Development:** Git, GitHub, VS Code

**Deployment:** Vercel

**Planned:** Python, FastAPI, PostgreSQL, IoT/CNC integration and Machine Learning.

---

## 💻 Run Locally

    git clone https://github.com/Rishwanth26/toolsense-cnc-management.git
    cd toolsense-cnc-management
    npm install
    npm run dev

### Production Build

    npm run build

---

## ☁️ Deployment

ToolSense is deployed using **Vercel** and connected to the GitHub `main` branch.

Deployment workflow:

    Local Development
           ↓
          Git
           ↓
        GitHub
           ↓
        Vercel
           ↓
       Production

🌐 **Live Application:** https://toolsense-cnc.vercel.app

---

## 🔮 Future Improvements

- Real CNC controller integration
- Real-time sensor data
- Backend API and database
- User authentication and roles
- Tool-life prediction
- Machine fault detection
- Predictive maintenance
- Notifications and analytics

---

## 📊 Current Prototype vs Production

| Area | Current Prototype | Production Version |
|---|---|---|
| Tool tracking | ✅ | ✅ |
| Tool sessions | ✅ | ✅ |
| Multiple machines | ✅ | ✅ |
| Inventory | ✅ | ✅ |
| Alerts | ✅ | ✅ |
| Session history | ✅ | ✅ |
| Machine health | Simulated signals | Real machine data |
| Diagnostics | Prototype decision layer | AI/ML models |
| Database | Frontend state | PostgreSQL |
| CNC integration | Planned | Required |
| Authentication | Planned | Required |
| Predictive maintenance | Planned | AI/ML |

---

## 🎯 Goal

ToolSense brings **tool usage, machine health and operator guidance** into one platform to help reduce unexpected tool failures, improve machine visibility and support predictive maintenance.

The current prototype focuses on demonstrating the complete operator workflow, while the architecture allows real CNC data, backend services and AI/ML capabilities to be added later.

> **Track the tool. Monitor the machine. Guide the operator.**

---

## 🔗 Links

🌐 **Live Demo:** https://toolsense-cnc.vercel.app

💻 **GitHub Repository:** https://github.com/Rishwanth26/toolsense-cnc-management