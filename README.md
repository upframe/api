[![Build Status](https://travis-ci.com/upframe/api.svg?branch=master)](https://travis-ci.com/upframe/api)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/4e8c21bef65d479990a8aa8219976218)](https://www.codacy.com/app/Upframe/api?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=upframe/api&amp;utm_campaign=Badge_Grade)

# 🔥 Api
The API for our platform and services. Achieved with Node.js.

# Installation

Quick and easy install thanks to Yarn

```
git clone https://github.com/upframe/api.git
cd api
yarn install
```

All the dependencies are now installed. Let's take care of the following environment variables. There are two ways get them working. **Option 1** is to get a copy of our .env file, a secret file with all the environment variables we use in production (for Upframe developers only). We take this file and add it to the root folder. **Option 2** is to manually set them up. We prefer the first option but the second one also works. Here is a list of said environment variables and what their use is.

**NODE_ENV** - "development" or anything else. Controls our CORS policy to allow localhost.
**REGISTER** - Temporary. When it's a number it opens our registration endpoint.
**DB_HOST** - A MySQL database URL to connect to.
**DB_USER** - MySQL database username.
**DB_PASSWORD** - MySQL database password.
**DB_NAME** - MySQL database name.
**CONNECT_PK** - 
**MG_APIKEY** - Mailgun API key.
**MG_DOMAIN** - Mailgun domain.
**IAM_USER_KEY** - AWS IAM user key with access to S3.
**IAM_USER_SECRET** - AWS IAM secret with access to S3.
**BUCKET_NAME** - AWS S3 bucket name.
**CLIENT_ID** - Google API ID.
**CLIENT_SECRET** - Google API Secret.
**GOOGLE_CALLBACK_URL** - Google API OAuth Callback.

# Running

Development

```
yarn dev
```

Production

```
yarn prod
```

# License

[GPL © Upframe](../master/LICENSE)
