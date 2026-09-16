\# Vhutec Med



Vhutec Med is a web-based medical appointment and patient queue management system developed for Vhutelu Resources (Pty) Ltd.



\## Project Structure



```text

vhutec-med/

├── client/

│   ├── src/

│   │   ├── features/

│   │   │   ├── patient/

│   │   │   ├── receptionist/

│   │   │   └── doctor/

│   │   ├── components/

│   │   ├── context/

│   │   ├── api/

│   │   ├── App.jsx

│   │   ├── App.css

│   │   ├── index.css

│   │   └── main.jsx

│   └── package.json

│

├── server/

│   ├── src/

│   │   ├── routes/

│   │   ├── controllers/

│   │   ├── middleware/

│   │   ├── sockets/

│   │   └── app.js

│   ├── prisma/

│   │   └── schema.prisma

│   └── package.json

│

├── .gitignore

└── README.md

```



\## Technology Stack



\### Frontend



\* React

\* Vite

\* React Router

\* Axios

\* Socket.IO Client



\### Backend



\* Node.js

\* Express.js

\* Socket.IO

\* Prisma

\* PostgreSQL

\* JWT

\* bcryptjs

\* Zod



\## Requirements



Make sure the following are installed:



\* Node.js

\* npm

\* PostgreSQL

\* Git



\## Installation



Clone the repository and install dependencies.



\### Backend



```bash

cd server

npm install

```



Configure the backend environment variables in:



```text

server/.env

```



Do not commit `.env` files or database credentials to GitHub.



\### Frontend



```bash

cd client

npm install

```



\## Running the Application



\### Start the Backend



```bash

cd server

npm start

```



The backend runs on:



```text

http://localhost:5000

```



\### Start the Frontend



```bash

cd client

npm run dev

```



The frontend runs on:



```text

http://localhost:5173

```



\## Environment Variables



The backend uses environment variables for configuration.



DATABASE\_URL="postgresql://postgres:Mthosbudah@03@localhost:5432/vhutec-med"

PORT=5000

JWT\_SECRET=

