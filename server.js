const dotenv = require("dotenv");
const mongoose = require("mongoose");

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION shutting down')
    console.log(err.name, err.message, err)
    process.exit(1)
})


dotenv.config({path: "./config.env"});
const app = require("./app");

const DB = process.env.DATABASE.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD
);

mongoose
    .connect(DB, {
        useCreateIndex: true,
        useFindAndModify: false,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log("DB connection successful");
    })
    .catch(() => {
        console.log("DB connection failed");
    });

// port is necessary
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Listening to port ${PORT}`);
});

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION shutting down')
    console.log(err.name, err.message)
    server.close(() => {
        process.exit(1)
    })
})
