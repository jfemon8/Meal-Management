import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiUser, FiPhone, FiEye, FiEyeOff, FiSun, FiMoon } from 'react-icons/fi';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { name, email, phone, password, confirmPassword } = formData;

        if (!name || !email || !password) {
            toast.error('নাম, ইমেইল এবং পাসওয়ার্ড আবশ্যক');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('পাসওয়ার্ড মিলছে না');
            return;
        }

        if (password.length < 6) {
            toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
            return;
        }

        setLoading(true);
        try {
            await register(name, email, password, phone);
            toast.success('সফলভাবে রেজিস্ট্রেশন হয়েছে');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8 transition-colors duration-200">
            {/* Theme Toggle Button */}
            <button
                onClick={toggleTheme}
                className="fixed top-4 right-4 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-200"
                title={theme === 'dark' ? 'লাইট মোড' : 'ডার্ক মোড'}
            >
                {theme === 'dark' ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md transition-colors duration-200">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">রেজিস্ট্রেশন</h1>
                    <p className="text-gray-500 dark:text-gray-400">নতুন একাউন্ট তৈরি করুন</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="label dark:text-gray-300">নাম</label>
                        <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                placeholder="আপনার নাম দিন"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label dark:text-gray-300">ইমেইল</label>
                        <div className="relative">
                            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                placeholder="আপনার ইমেইল দিন"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label dark:text-gray-300">ফোন (ঐচ্ছিক)</label>
                        <div className="relative">
                            <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                placeholder="আপনার ফোন নম্বর দিন"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label dark:text-gray-300">পাসওয়ার্ড</label>
                        <div className="relative">
                            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="input pl-10 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                placeholder="পাসওয়ার্ড দিন (কমপক্ষে ৬ অক্ষর)"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="label dark:text-gray-300">পাসওয়ার্ড নিশ্চিত করুন</label>
                        <div className="relative">
                            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="input pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                placeholder="পাসওয়ার্ড আবার দিন"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-3 disabled:opacity-50"
                    >
                        {loading ? 'রেজিস্টার হচ্ছে...' : 'রেজিস্টার'}
                    </button>
                </form>

                <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
                    আগে থেকে একাউন্ট আছে?{' '}
                    <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                        লগইন করুন
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
