import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'federalpolicy24@gmail.com',
        pass: 'uzpciwqjfmsabxtz'
    }
});

export const sendOTPCode = async (email, code, purpose, name = '') => {
    try {
        await transporter.sendMail({
            from: '"FLIP System" <federalpolicy24@gmail.com>',
            to: email,
            subject: `FLIP: Your ${purpose} code is ${code}`,
            html: `<h2>Your code: ${code}</h2><p>Valid for 5 minutes.</p>`,
            text: `Your ${purpose} code is: ${code}`
        });
        console.log(`✅ Email sent to ${email}`);
        return true;
    } catch (error) {
        console.error(`❌ Email failed: ${error.message}`);
        return false;
    }
};

export const sendSolicitorMessage = async (solicitorEmail, userName, caseNumber, message, userEmail) => {
    try {
        await transporter.sendMail({
            from: '"FLIP System" <federalpolicy24@gmail.com>',
            to: solicitorEmail,
            subject: `FLIP: Message from ${userName} - Case ${caseNumber || 'N/A'}`,
            html: `<h3>Message from ${userName}</h3><p>Case: ${caseNumber}</p><p>${message}</p><p>Reply to: ${userEmail}</p>`,
            text: `Message from ${userName}\nCase: ${caseNumber}\n\n${message}\n\nReply to: ${userEmail}`
        });
        console.log(`✅ Solicitor message sent to ${solicitorEmail}`);
        return true;
    } catch (error) {
        console.error(`❌ Solicitor email failed: ${error.message}`);
        return false;
    }
};

export default { sendOTPCode, sendSolicitorMessage };
