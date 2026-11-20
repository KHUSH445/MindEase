
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestPasswordReset } from "../../services/api";

function ForgotPassword() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setErrorMessage("");

        if (!email.trim()) {
            setErrorMessage("Please enter your registered email.");
            return;
        }

        setIsLoading(true);

        try {
            const result = await requestPasswordReset(email.trim());
            setMessage(result.message);
        } catch (error) {
            setErrorMessage(
                error.message || "Unable to process your request."
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
                        Forgot Password?
                    </h1>

                    <p className="text-textSecondary mt-2">
                        Don't worry. Enter your email address and we'll
                        help you reset your password.
                    </p>
                </div>

                {message && (
                    <div className="mb-5 p-4 bg-green-50 text-green-700 rounded-xl text-sm text-center">
                        {message}
                    </div>
                )}

                {errorMessage && (
                    <div className="mb-5 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    <div>
                        <label className="block text-sm font-medium text-textPrimary mb-2">
                            Email Address
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your registered email"
                            required
                            className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary text-white py-3 rounded-xl hover:opacity-90 transition font-medium disabled:opacity-50 cursor-pointer"
                    >
                        {isLoading ? "Sending..." : "Send Reset Link"}
                    </button>

                </form>

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

export default ForgotPassword;
