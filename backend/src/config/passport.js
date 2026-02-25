import passport from "passport";
import { Strategy as GitHubStrategy } from 'passport-github2';
import { User } from "../db/models/User.js";

// Verify - find a user
passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ githubId: profile.id });

                if (!user) {
                    user = new User({
                        githubId: profile.id,
                        username: profile.username,
                        email: profile.emails?.[0]?.value,
                        avatar: profile.photos?.[0]?.value,
                    });
                    await user.save();
                }

                user.lastLoginAt = new Date();
                user.isActive = true;
                await user.save();

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);

// Remember user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Identify user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});