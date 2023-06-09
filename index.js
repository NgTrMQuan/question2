const express = require("express");
const { connectToDatabase , db} = require("./db");

const app = express();

app.listen(3005, () => {
  console.log("App is running at 3005");
  connectToDatabase();
});
