# 🏃‍♂️ Pace Pulse – Server

This is the backend server for the **Pace Pulse** platform – a dynamic marathon registration and management system. It provides secure APIs for managing marathons, user registrations, and admin access using Firebase authentication and MongoDB as the database.

---

## 🔗 Live Server

**🌍 API Base URL:** [https://pace-pulse-server.vercel.app/](https://pace-pulse-server.vercel.app/)

---

## 🖥️ Client Repository

Frontend (React) repo: [https://github.com/WasefUllah/pace-pulse-client](https://github.com/WasefUllah/pace-pulse-client)

---

## ⚙️ Tech Stack

- **Node.js** – Runtime environment  
- **Express.js** – Web framework  
- **Firebase Admin SDK** – Authentication & token verification  
- **MongoDB** – NoSQL database  
- **Vercel** – Server deployment  
- **dotenv** – Environment variable management  
- **CORS** – Cross-origin resource sharing support

---

## 🧰 Features

- 🔐 Firebase authentication with role-based route protection
- 📅 CRUD operations on marathons
- 👥 User registration and application tracking
- 📊 Aggregated data retrieval for registered marathons
- 🔁 Count increment/decrement for registered participants
- 🔍 Filtered upcoming/featured marathons
- ⚙️ Middleware for secure API access

---

## 📁 Folder Structure

/pace-pulse-server
├── .env # Environment variables
├── pace-pulse-firebase-adminsdk-*.json # Firebase Admin SDK credentials
├── index.js # Main entry point
├── package.json



---

## 🔐 API Authentication

All secured routes use Firebase ID token verification via headers:

Authorization: Bearer <token>



Additional email matching is done via query params (e.g., `?email=xyz@gmail.com`).

---

## 🚀 Getting Started Locally

### 1️⃣ Clone the repository

```bash
git clone https://github.com/WasefUllah/pace-pulse-server.git
cd pace-pulse-server
2️⃣ Install dependencies

npm install
3️⃣ Create a .env file

PORT=3000
DB_USER=your_mongodb_user
DB_PASS=your_mongodb_password
4️⃣ Add Firebase Admin SDK JSON
Place your Firebase Admin SDK credential file in the root folder and ensure the filename matches the one in require() in index.js.

5️⃣ Run the server

node index.js
Server runs on http://localhost:3000 by default or whatever port you set.

📌 API Endpoints (Sample)
Method	Endpoint	Description
GET	/featuredmarathon	Get 6 random marathons
GET	/upcomingmarathon	Get marathons with future reg dates
GET	/allmarathons?email=xyz@gmail.com	Get marathons created by user (auth required)
POST	/marathon	Add a new marathon
PATCH	/marathon/increment/:id	Increment reg count
GET	/aggregate?email=xyz@gmail.com	Get marathon details user has registered for (auth required)
DELETE	/registrations/:id	Delete a registration

More endpoints exist for full CRUD on marathons and registrations.

✍️ Contribution
Pull requests are welcome! Please open an issue to discuss changes first.

📄 License
MIT (or mention if private use only)

🙋‍♂️ Author
Wasef Ullah
GitHub: WasefUllah



Let me know if you'd like a badge-style header or want me to also make a `README.md` for the client repo!









Ask ChatGPT
