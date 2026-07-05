# OnlyFunds - Core Backend Service 

OnlyFunds is a simulated centralised exchange. It end to end simulates how a trading application works. The current project simulates 2 types of markets . Spot and Perpetual Market.

### Context
This is a Core Backend Service, which handles all customer facing APIs and orchestrates request to all other engines and services.

## Setup

**Prerequisites:** Node.js 18+, a Postgres instance (local or Atlas), Redis, Minio .

```bash
git clone https://github.com/Bhargav16exd/CEX.git
cd CEX
npm install
```

Create a `.env` file in the project root:

```env
PORT=someport

DATABASE_URL=postgres_url

REDIS_URL=redis://localhost:6379

JWT_SECRET_KEY=somestring

MINIO_ACCESS_KEY=some_access_key
MINIO_SECRET_KEY=some_secret_key

MINIO_ENDPOINT=minio

CORS_ORIGIN_URL=*
```

Run it:

```bash
npm run build
npm run dev
```
## Other Supporting Services Repositories 

`To run project end to end you need to setup below services too ...`

Core-Backend-Service :
https://github.com/Bhargav16exd/CEX

Spot Engine : 
https://github.com/Bhargav16exd/CEX-Spot-Engine

Perpetual Engine :
https://github.com/Bhargav16exd/CEX-Perp-Engine

WS Engine :
https://github.com/Bhargav16exd/CEX-Ws

Database Engine :
https://github.com/Bhargav16exd/CEX-DB-Engine


## More Technical Details are available here :  
```bash
https://app.notion.com/p/Projects-39072e56834880f8a442c07055654eec
```

## Author

Built by [**Bhargav16exd**](https://github.com/Bhargav16exd). Issues and PRs welcome if something looks off.