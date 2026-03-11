import passport from "passport";
import { Strategy as GitHubStrategy } from 'passport-github2';
import { encrypt } from "../utils/encryption.js";
import { User } from "../db/models/User.js";
import config from "../config/environment.js";

passport.use(
    new GitHubStrategy(
        {
            clientID: config.GITHUB_CLIENT_ID,
            clientSecret: config.GITHUB_CLIENT_SECRET,
            callbackURL: config.GITHUB_CALLBACK_URL,
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
                        githubAccessToken: encrypt(accessToken),
                        githubTokenEncrypted: true,
                    });
                    await user.save();
                } else {
                    user.githubAccessToken = encrypt(accessToken);
                    user.githubTokenEncrypted = true;
                    user.lastLoginAt = new Date();
                    user.isActive = true;
                    await user.save();
                }

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});