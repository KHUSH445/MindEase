
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../services/api";

function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setErrorMessage("");

        if (!token) {
            setErrorMessage(
                "Invalid reset link. Please request a new password reset link."
            );
            return;
        }

        if (password.length < 8) {
            setErrorMessage("Password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            const result = await resetPassword(token, password);

            setMessage(result.message);
            setPassword("");
            setConfirmPassword("");
        } catch (error) {
            setErrorMessage(
                error.message || "Unable to reset your password."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-6">

            <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6 sm:p-8">

                <div className="text-center mb-8">
                    <div className="text-primary text-3xl mb-2">💜</div>

                    <h1 className="text-3xl font-heading font-bold text-textPrimary">
                        Reset Password
                    </h1>

                    <p className="text-textSecondary mt-2">
                        Create a new password for your MindEase account.
                    </p>
                </div>

                {message && (
                    <div className="mb-5 p-4 bg-green-50 text-green-700 rounded-xl text-sm text-center">
                        {message}

                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="block mx-auto mt-3 font-semibold underline"
                        >
                            Go to Login
                        </button>
                    </div>
                )}

                {errorMessage && (
                    <div className="mb-5 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
                        {errorMessage}
                    </div>
                )}

                {!message && (
                    <>
                        {!token && (
                            <p className="mb-5 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
                                The reset link is missing its token.
                                Please request a new one.
                            </p>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">

                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-2">
                                    New Password
                                </label>

                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    minLength={8}
                                    required
                                    disabled={!token}
                                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-2">
                                    Confirm New Password
                                </label>

                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    minLength={8}
                                    required
                                    disabled={!token}
                                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !token}
                                className="w-full bg-primary text-white py-3 rounded-xl hover:opacity-90 transition font-medium disabled:opacity-50 cursor-pointer"
                            >
                                {isLoading ? "Updating..." : "Reset Password"}
                            </button>

                        </form>
                    </>
                )}

                <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="block mx-auto mt-6 text-sm text-primary font-semibold cursor-pointer"
                >
                    ← Back to Login
                </button>

            </div>

        </div>
    );
}

export default ResetPassword;
