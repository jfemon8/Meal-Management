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

interface EmailContent {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

interface EmailSendResult {
    success: boolean;
    messageId: string;
    message: string;
}

interface DeviceInfo {
    browser?: string;
    os?: string;
    device?: string;
    ip?: string;
    platform?: string;
    userAgent?: string;
}

interface HolidayInfo {
    date: string | Date;
    name?: string;
    nameBn?: string;
    type?: 'government' | 'optional' | 'religious';
}

/**
 * Send OTP Email
 */
const sendOTPEmail = async (email: string, otp: string, purpose: string, expiryMinutes: number = 10): Promise<EmailSendResult> => {
    const purposeMap: Record<string, string> = {
        'login': 'লগইন',
        'password_reset': 'পাসওয়ার্ড রিসেট',
        'email_verification': 'ইমেইল যাচাই',
        'account_activation': 'অ্যাকাউন্ট সক্রিয়করণ',
        '2fa': 'টু-ফ্যাক্টর অথেন্টিকেশন'
    };

    const purposeBengali = purposeMap[purpose] || purpose;

    const emailContent: EmailContent = {
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
 */
const sendPasswordResetEmail = async (email: string, resetToken: string, resetUrl: string): Promise<EmailSendResult> => {
    const emailContent: EmailContent = {
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
 */
const sendWelcomeEmail = async (email: string, name: string): Promise<EmailSendResult> => {
    const emailContent: EmailContent = {
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
 */
const sendLoginAlertEmail = async (email: string, deviceInfo: DeviceInfo, loginTime: Date): Promise<EmailSendResult> => {
    const { formatDeviceInfo } = require('./deviceFingerprint');
    const deviceStr: string = formatDeviceInfo(deviceInfo);

    const emailContent: EmailContent = {
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

/**
 * Send Low Balance Warning Email
 */
const sendLowBalanceEmail = async (email: string, name: string, balanceType: string, currentBalance: number, threshold: number): Promise<EmailSendResult> => {
    const balanceNames: Record<string, string> = {
        breakfast: 'ব্রেকফাস্ট',
        lunch: 'লাঞ্চ',
        dinner: 'ডিনার'
    };

    const emailContent: EmailContent = {
        to: email,
        subject: `কম ব্যালেন্স সতর্কতা - ${balanceNames[balanceType]}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .balance-box { background: white; border: 2px solid #ef4444; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .balance { font-size: 32px; font-weight: bold; color: #ef4444; }
        .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ কম ব্যালেন্স সতর্কতা</h1>
        </div>
        <div class="content">
            <h2>প্রিয় ${name},</h2>
            <p>আপনার <strong>${balanceNames[balanceType]}</strong> ব্যালেন্স সতর্কতা সীমার নিচে নেমে গেছে।</p>

            <div class="balance-box">
                <p>বর্তমান ব্যালেন্স</p>
                <div class="balance">${currentBalance} টাকা</div>
                <p style="color: #6b7280;">সতর্কতা সীমা: ${threshold} টাকা</p>
            </div>

            <p>মিল সার্ভিস চালু রাখতে অনুগ্রহ করে আপনার ব্যালেন্স রিচার্জ করুন।</p>

            <div style="text-align: center;">
                <a href="#" class="button">ব্যালেন্স রিচার্জ করুন</a>
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

    console.log('📧 Low balance email to be sent to:', email);
    console.log(`Balance Type: ${balanceType}, Current: ${currentBalance}, Threshold: ${threshold}`);

    return {
        success: true,
        messageId: `dev-${Date.now()}`,
        message: 'Email sent successfully (development mode)'
    };
};

/**
 * Send Month Closing Reminder Email
 */
const sendMonthClosingEmail = async (email: string, name: string, year: number, month: string, daysRemaining: number): Promise<EmailSendResult> => {
    const emailContent: EmailContent = {
        to: email,
        subject: `মাস শেষের রিমাইন্ডার - ${daysRemaining} দিন বাকি`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .days-box { background: white; border: 2px solid #f59e0b; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .days { font-size: 48px; font-weight: bold; color: #f59e0b; }
        .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 10px 5px; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 মাস শেষের রিমাইন্ডার</h1>
        </div>
        <div class="content">
            <h2>প্রিয় ${name},</h2>
            <p>${year} সালের ${month} মাস শেষ হতে চলেছে।</p>

            <div class="days-box">
                <div class="days">${daysRemaining}</div>
                <p>দিন বাকি</p>
            </div>

            <p>অনুগ্রহ করে:</p>
            <ul>
                <li>আপনার মিল স্ট্যাটাস চেক করুন</li>
                <li>প্রয়োজনে ব্যালেন্স রিচার্জ করুন</li>
                <li>বাকি দিনের মিল কনফার্ম করুন</li>
            </ul>

            <div style="text-align: center;">
                <a href="#" class="button">মিল দেখুন</a>
                <a href="#" class="button">ব্যালেন্স দেখুন</a>
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

    console.log('📧 Month closing email to be sent to:', email);

    return {
        success: true,
        messageId: `dev-${Date.now()}`,
        message: 'Email sent successfully (development mode)'
    };
};

/**
 * Send Holiday Update Email
 */
const sendHolidayUpdateEmail = async (email: string, name: string, action: string, holiday: HolidayInfo): Promise<EmailSendResult> => {
    const actionTexts: Record<string, string> = {
        added: 'নতুন ছুটি যোগ হয়েছে',
        updated: 'ছুটির তথ্য আপডেট হয়েছে',
        removed: 'ছুটি বাতিল হয়েছে'
    };

    const date = new Date(holiday.date).toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
    });

    const emailContent: EmailContent = {
        to: email,
        subject: `${actionTexts[action]} - ${holiday.nameBn || holiday.name}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .holiday-box { background: white; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 ${actionTexts[action]}</h1>
        </div>
        <div class="content">
            <h2>প্রিয় ${name},</h2>

            <div class="holiday-box">
                <h3>${holiday.nameBn || holiday.name}</h3>
                <p><strong>তারিখ:</strong> ${date}</p>
                <p><strong>ধরন:</strong> ${holiday.type === 'government' ? 'সরকারি ছুটি' : holiday.type === 'religious' ? 'ধর্মীয় ছুটি' : 'ঐচ্ছিক ছুটি'}</p>
            </div>

            <p>${action === 'removed' ? 'এই দিন এখন কর্মদিবস হিসেবে গণ্য হবে এবং মিল চালু থাকবে।' : 'এই দিন মিল বন্ধ থাকবে।'}</p>
        </div>
        <div class="footer">
            <p>ধন্যবাদ,<br>Meal Management System টিম</p>
        </div>
    </div>
</body>
</html>
        `
    };

    console.log('📧 Holiday update email to be sent to:', email);

    return {
        success: true,
        messageId: `dev-${Date.now()}`,
        message: 'Email sent successfully (development mode)'
    };
};

export {
    sendOTPEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendLoginAlertEmail,
    sendLowBalanceEmail,
    sendMonthClosingEmail,
    sendHolidayUpdateEmail
};
