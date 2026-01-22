import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth() as any;
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('সব ফিল্ড পূরণ করুন');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            toast.success('সফলভাবে লগইন হয়েছে');
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'লগইন ব্যর্থ হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 transition-all duration-500 relative overflow-hidden">
            {/* Animated background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-0 -left-4 w-72 h-72 bg-primary-300/30 dark:bg-primary-700/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl"
                    animate={{
                        x: [0, 100, 0],
                        y: [0, 50, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute top-0 right-4 w-72 h-72 bg-primary-400/30 dark:bg-primary-600/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl"
                    animate={{
                        x: [0, -100, 0],
                        y: [0, 100, 0],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute -bottom-8 left-20 w-72 h-72 bg-primary-500/30 dark:bg-primary-800/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl"
                    animate={{
                        x: [0, 50, 0],
                        y: [0, -50, 0],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            {/* Theme Toggle Button */}
            <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                onClick={toggleTheme}
                className="fixed top-6 right-6 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 text-gray-700 dark:text-gray-200 z-50 hover:scale-110"
                title={theme === 'dark' ? 'লাইট মোড' : 'ডার্ক মোড'}
            >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-white/20 dark:border-gray-700/50 shadow-2xl">
                    <CardHeader className="space-y-1 text-center pb-6">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <CardTitle className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                                মিল ম্যানেজমেন্ট
                            </CardTitle>
                        </motion.div>
                        <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                            আপনার একাউন্টে লগইন করুন
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-2"
                            >
                                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                                    ইমেইল
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-11 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-500 transition-all"
                                        placeholder="আপনার ইমেইল দিন"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-2"
                            >
                                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                                    পাসওয়ার্ড
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 h-11 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-500 transition-all"
                                        placeholder="আপনার পাসওয়ার্ড দিন"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-11 text-base font-medium bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <motion.div
                                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            />
                                            লগইন হচ্ছে...
                                        </span>
                                    ) : 'লগইন'}
                                </Button>
                            </motion.div>
                        </form>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="text-center mt-6 text-gray-600 dark:text-gray-400"
                        >
                            একাউন্ট নেই?{' '}
                            <Link
                                to="/register"
                                className="text-primary-600 dark:text-primary-400 hover:underline font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                            >
                                রেজিস্টার করুন
                            </Link>
                        </motion.p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default Login;
