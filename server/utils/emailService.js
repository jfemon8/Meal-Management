/**
 * Email Service Utility
 *
 * Note: This is a placeholder implementation. In production, you should:
 * 1. Use a proper email service (SendGrid, AWS SES, Mailgun, etc.)
 * 2. Configure SMTP settings in environment variables
 * 3. Use email templates
 *
 * For now, this logs emails to console for development purposes.
 */

/**
 * Send OTP Email
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} purpose - Purpose of OTP
 * @param {number} expiryMinutes - OTP expiry time in minutes
 * @returns {Promise<Object>} Send result
 */
const sendOTPEmail = async (email, otp, purpose, expiryMinutes = 10) => {
    const purposeMap = {
        'login': 'লগইন',
        'password_reset': 'পাসওয়ার্ড রিসেট',
        'email_verification': 'ইমেইল যাচাই',
        'account_activation': 'অ্যাকাউন্ট সক্রিয়করণ',
        '2fa': 'টু-ফ্যাক্টর অথেন্টিকেশন'
    };

    const purposeBengali = purposeMap[purpose] || purpose;

    const emailContent = {
        to: email,
        subject: `আপনার OTP কোড - ${purposeBengali}`,
        text: `
আপনার OTP কোড: ${otp}

এই কোডটি ${expiryMinutes} মিনিটের জন্য বৈধ।
কাউকে এই কোড শেয়ার করবেন না।

উদ্দেশ্য: ${purposeBengali}

ধন্যবাদ,
Meal Management System
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .otp-box { background: white; border: 2px dashed #10b981; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 5px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Meal Management System</h1>
        </div>
        <div class="content">
            <h2>আপনার OTP কোড</h2>
            <p>উদ্দেশ্য: <strong>${purposeBengali}</strong></p>

            <div class="otp-box">
                <div class="otp-code">${otp}</div>
            </div>

            <p>এই কোডটি <strong>${expiryMinutes} মিনিটের</strong> জন্য বৈধ।</p>

            <div class="warning">
                <strong>⚠️ সতর্কতা:</strong> কাউকে এই কোড শেয়ার করবেন না। আমরা কখনও ফোন বা ইমেইলে আপনার OTP চাইব না।
            </div>

            <p>যদি আপনি এই OTP অনুরোধ না করে থাকেন, তাহলে এই ইমেইল উপেক্ষা করুন।</p>
        </div>
        <div class="footer">
            <p>ধন্যবাদ,<br>Meal Management System টিম</p>
        </div>
    </div>
</body>
</html>
        `
    };

    // TODO: Replace with actual email sending logic
    console.log('📧 Email to be sent:', emailContent);
    console.log(`\n=== OTP EMAIL ===`);
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Purpose: ${purposeBengali}`);
    console.log(`Expires in: ${expiryMinutes} minutes`);
    console.log(`================\n`);

    // Simulate email sending
    return {
        success: true,
        messageId: `dev-${Date.now()}`,
        message: 'Email sent successfully (development mode)'
    };
};

/**
 * Send Password Reset Email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} resetUrl - Password reset URL
 * @returns {Promise<Object>} Send result
 */
const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
    const emailContent = {
        to: email,
        subject: 'পাসওয়ার্ড রিসেট অনুরোধ',
        text: `
আপনার পাসওয়ার্ড রিসেট করতে নিচের লিংকে ক্লিক করুন:

${resetUrl}

অথবা এই কোড ব্যবহার করুন: ${resetToken}

এই লিংকটি 1 ঘন্টার জন্য বৈধ।

যদি আপনি পাসওয়ার্ড রিসেট অনুরোধ না করে থাকেন, তাহলে এই ইমেইল উপেক্ষা করুন।

ধন্যবাদ,
Meal Management System
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
        .token-box { background: white; border: 2px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px; word-break: break-all; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>পাসওয়ার্ড রিসেট</h1>
        </div>
        <div class="content">
            <h2>আপনার পাসওয়ার্ড রিসেট করুন</h2>
            <p>আমরা আপনার অ্যাকাউন্টের জন্য পাসওয়ার্ড রিসেট অনুরোধ পেয়েছি।</p>

            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">পাসওয়ার্ড রিসেট করুন</a>
            </div>

            <p>যদি বাটন কাজ না করে, তাহলে নিচের কোডটি ব্যবহার করুন:</p>
            <div class="token-box">
                <strong>রিসেট কোড:</strong> ${resetToken}
            </div>

            <p>এই লিংকটি <strong>1 ঘন্টার</strong> জন্য বৈধ।</p>

            <div class="warning">
                <strong>⚠️ সতর্কতা:</strong> যদি আপনি এই অনুরোধ না করে থাকেন, তাহলে অবিলম্বে আপনার অ্যাকাউন্টের নিরাপত্তা পরীক্ষা করুন এবং এই ইমেইল উপেক্ষা করুন।
            </div>
        </div>
        <div class="footer">
            <p>ধন্যবাদ,<br>Meal Management System টিম</p>
        </div>
    </div>
</body>
</html>
        `
    };

    // TODO: Replace with actual email sending logic
    console.log('📧 Email to be sent:', emailContent);
    console.log(`\n=== PASSWORD RESET EMAIL ===`);
    console.log(`To: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Token: ${resetToken}`);
    console.log(`============================\n`);

    return {
        success: true,
        messageId: `dev-${Date.now()}`,
        message: 'Email sent successfully (development mode)'
    };
};

/**
 * Send Welcome Email
 * @param {string} email - Recipient email
 * @param {string} name - User name
 * @returns {Promise<Object>} Send result
 */
const sendWelcomeEmail = async (email, name) => {
    const emailContent = {
        to: email,
        subject: 'Meal Management System এ স্বাগতম',
        text: `
প্রিয় ${name},

Meal Management System এ আপনাকে স্বাগতম!

আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। এখন আপনি লগইন করে সিস্টেম ব্যবহার শুরু করতে পারেন।

শুভেচ্ছা,
Meal Management System টিম
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 স্বাগতম!</h1>
        </div>
        <div class="content">
            <h2>প্রিয় ${name},</h2>
            <p>Meal Management System এ আপনাকে স্বাগতম!</p>
            <p>আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। এখন আপনি লগইন করে সিস্টেম ব্যবহার শুরু করতে পারেন।</p>
            <p>যদি কোনো সমস্যা হয়, আমাদের সাথে যোগাযোগ করতে দ্বিধা করবেন না।</p>
        </div>
        <div class="footer">
            <p>শুভেচ্ছা,<br>Meal Management System টিম</p>
        </div>
    </div>
</body>
</html>
        `
    };

    console.log('📧 Welcome email to be sent to:', email);

    return {
        success: true,
        messageId: `dev-${Date.now()}`,
        message: 'Email sent successfully (development mode)'
    };
};

/**
 * Send Login Alert Email
 * @param {string} email - Recipient email
 * @param {Object} deviceInfo - Device information
 * @param {Date} loginTime - Login timestamp
 * @returns {Promise<Object>} Send result
 */
const sendLoginAlertEmail = async (email, deviceInfo, loginTime) => {
    const { formatDeviceInfo } = require('./deviceFingerprint');
    const deviceStr = formatDeviceInfo(deviceInfo);

    const emailContent = {
        to: email,
        subject: 'নতুন লগইন সনাক্ত হয়েছে',
        text: `
নতুন লগইন সনাক্ত হয়েছে

ডিভাইস: ${deviceStr}
আইপি: ${deviceInfo.ip}
সময়: ${loginTime.toLocaleString('bn-BD')}

যদি এটি আপনি না হয়ে থাকেন, অবিলম্বে আপনার পাসওয়ার্ড পরিবর্তন করুন।

ধন্যবাদ,
Meal Management System
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .info-box { background: white; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 নতুন লগইন সনাক্ত</h1>
        </div>
        <div class="content">
            <h2>আপনার অ্যাকাউন্টে নতুন লগইন হয়েছে</h2>

            <div class="info-box">
                <p><strong>ডিভাইস:</strong> ${deviceStr}</p>
                <p><strong>আইপি এড্রেস:</strong> ${deviceInfo.ip}</p>
                <p><strong>সময়:</strong> ${loginTime.toLocaleString('bn-BD')}</p>
            </div>

            <div class="warning">
                <strong>⚠️ সতর্কতা:</strong> যদি এটি আপনি না হয়ে থাকেন, অবিলম্বে আপনার পাসওয়ার্ড পরিবর্তন করুন এবং সকল সক্রিয় সেশন লগআউট করুন।
            </div>
        </div>
        <div class="footer">
            <p>ধন্যবাদ,<br>Meal Management System টিম</p>
        </div>
    </div>
</body>
</html>
        `
    };

    console.log('📧 Login alert email to be sent to:', email);

    return {
        success: true,
        messageId: `dev-${Date.now()}`,
        message: 'Email sent successfully (development mode)'
    };
};

module.exports = {
    sendOTPEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendLoginAlertEmail
};
