# 🔐 Restraint Protocol Backend

Backend API for **Restraint Protocol (RP)** — a Focus-to-Earn and Discipline Staking system that helps users build digital self-control through accountability, restrictions, and financial incentives.

Built for Android (Ionic + Capacitor) and designed for hackathon demo + future Web3 expansion.

---

## 🚀 Overview

Restraint Protocol transforms discipline into an economic system.

Users create focus challenges, stake value, block distractions, and earn rewards for staying disciplined.

If they fail, they lose their stake.

---

## 🧠 Core Features

- 🔑 JWT Authentication (Login/Register)
- 🎯 Focus Challenge System
- 💰 Staking & Reward Logic (MVP simulation ready)
- ⛔ App & Website Restriction Tracking
- 📊 Discipline Score & Streak System
- 👥 Accountability Partner System
- 🚨 Violation Detection & Logging
- 🧘 Focus Mode Lifecycle Management

---

## 🏗️ Tech Stack

- Node.js
- Express.js
- JavaScript (Vanilla)
- JWT (Authentication)
- bcrypt (Password hashing)
- JSON / SQLite (MVP storage)

---

## 📡 API Structure

### Auth
- POST `/api/auth/register`
- POST `/api/auth/login`

### Challenges
- POST `/api/challenges/create`
- GET `/api/challenges/active`
- POST `/api/challenges/complete`
- POST `/api/challenges/fail`

### Staking
- POST `/api/stake/create`
- GET `/api/stake/history`

### Violations
- POST `/api/violation/log`
- GET `/api/violation/history`

### Accountability
- POST `/api/accountability/add`
- GET `/api/accountability/list`

---

## ⚙️ Installation

```bash
git clone https://github.com/your-username/restraint-protocol-backend.git
cd restraint-protocol-backend
npm install
npm start
