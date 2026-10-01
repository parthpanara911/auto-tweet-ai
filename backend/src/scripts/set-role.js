import { parseArgs } from "node:util";
import mongoose from "mongoose";
import config from "../config/environment.js";
import connectDB from "../db/connection.js";
import User from "../db/models/User.js";

const ALLOWED_ROLES = ["user", "admin"];

const { values } = parseArgs({
    options: {
        githubId: { type: "string" },
        role: { type: "string", default: "admin" },
    },
});

async function main() {
    const { githubId, role } = values;

    if (!githubId || !/^\d+$/.test(githubId)) {
        throw new Error("--githubId is required and must be numeric");
    }
    if (!ALLOWED_ROLES.includes(role)) {
        throw new Error(`--role must be one of: ${ALLOWED_ROLES.join(", ")}`);
    }

    await connectDB();

    const user = await User.findOneAndUpdate(
        { githubId },
        { $set: { role } },
        { returnDocument: "after", runValidators: true }
    ).select("githubId username role");

    if (!user) {
        throw new Error(
            "User not found. They must log in via GitHub at least once first."
        );
    }

    console.log(
        `[AUDIT] role set: githubId=${user.githubId} username=${user.username} role=${user.role} at=${new Date().toISOString()}`
    );
}

main()
    .catch((err) => {
        console.error("Failed:", err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());