import config from "./config/environment.js";
import app from "./app.js";
import connectDB from "./db/connection.js";

connectDB();

const PORT = config.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));