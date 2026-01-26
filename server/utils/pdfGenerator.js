const PDFDocument = require('pdfkit');
const path = require('path');

/**
 * Generate lunch statement PDF for a user
 */
const generateLunchStatementPDF = (data, res) => {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
            Title: `লাঞ্চ স্টেটমেন্ট - ${data.user.name}`,
            Author: 'মিল ম্যানেজমেন্ট সিস্টেম',
            Subject: 'মাসিক লাঞ্চ স্টেটমেন্ট'
        }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=lunch-statement-${data.user.name}-${data.period.year}-${data.period.month}.pdf`);

    // Pipe to response
    doc.pipe(res);

    // ===== Header Section =====
    doc.fontSize(20)
        .text('মিল ম্যানেজমেন্ট সিস্টেম', { align: 'center' })
        .fontSize(16)
        .text('লাঞ্চ স্টেটমেন্ট', { align: 'center' })
        .moveDown(0.5);

    // ===== User Info Section =====
    doc.fontSize(12)
        .text(`নাম: ${data.user.name}`, { continued: true })
        .text(`    ইমেইল: ${data.user.email || 'N/A'}`, { align: 'right' })
        .text(`ফোন: ${data.user.phone || 'N/A'}`, { continued: true })
        .text(`    গ্রুপ: ${data.group?.name || 'N/A'}`, { align: 'right' })
        .moveDown();

    // ===== Period Info =====
    doc.rect(50, doc.y, 495, 25).fill('#f0f0f0');
    doc.fillColor('black')
        .fontSize(11)
        .text(`সময়কাল: ${formatDateBn(data.period.startDate)} থেকে ${formatDateBn(data.period.endDate)}`, 55, doc.y - 20)
        .moveDown(1.5);

    // ===== Summary Table =====
    const summaryY = doc.y;
    doc.fontSize(12).text('সারসংক্ষেপ', { underline: true }).moveDown(0.5);

    const summaryData = [
        ['বিবরণ', 'পরিমাণ'],
        ['মোট লাঞ্চ দিন', `${data.summary.totalDays} দিন`],
        ['মোট লাঞ্চ মিল', `${data.summary.totalMeals} টি`],
        ['প্রতি মিল রেট', `৳${data.summary.rate}`],
        ['মোট চার্জ', `৳${data.summary.totalCharge}`],
        ['বর্তমান ব্যালেন্স', `৳${data.summary.currentBalance}`],
        [data.summary.dueAdvance.type === 'due' ? 'বকেয়া' : 'অগ্রিম', `৳${data.summary.dueAdvance.amount}`]
    ];

    drawTable(doc, summaryData, 50, doc.y, [250, 245], true);
    doc.moveDown(2);

    // ===== Daily Details Table =====
    doc.fontSize(12).text('দৈনিক বিবরণ', { underline: true }).moveDown(0.5);

    const dailyHeaders = ['তারিখ', 'দিন', 'স্ট্যাটাস', 'মিল সংখ্যা', 'মন্তব্য'];
    const dailyData = [dailyHeaders];

    data.dailyDetails.forEach(day => {
        let status = day.isOn ? 'চালু' : 'বন্ধ';
        let comment = '';
        if (day.isHoliday) {
            comment = `ছুটি: ${day.holidayName || ''}`;
        } else if (day.isWeekend) {
            comment = 'সাপ্তাহিক বন্ধ';
        } else if (day.isManuallySet) {
            comment = 'ম্যানুয়ালি সেট';
        }

        dailyData.push([
            day.date,
            day.dayName,
            status,
            day.count.toString(),
            comment
        ]);
    });

    drawTable(doc, dailyData, 50, doc.y, [90, 70, 60, 70, 205]);

    // ===== Footer =====
    doc.moveDown(2);
    doc.fontSize(9)
        .fillColor('gray')
        .text(`তৈরির তারিখ: ${new Date().toLocaleString('bn-BD')}`, { align: 'right' })
        .text(`তৈরিকারী: ${data.generatedBy || 'সিস্টেম'}`, { align: 'right' });

    doc.end();
};

/**
 * Generate group lunch statement PDF for all members
 */
const generateGroupLunchStatementPDF = (data, res) => {
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
        info: {
            Title: `গ্রুপ লাঞ্চ স্টেটমেন্ট - ${data.group.name}`,
            Author: 'মিল ম্যানেজমেন্ট সিস্টেম',
            Subject: 'মাসিক গ্রুপ লাঞ্চ স্টেটমেন্ট'
        }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=group-lunch-statement-${data.group.name}-${data.period.year}-${data.period.month}.pdf`);

    doc.pipe(res);

    // ===== Header =====
    doc.fontSize(18)
        .text('মিল ম্যানেজমেন্ট সিস্টেম', { align: 'center' })
        .fontSize(14)
        .text(`গ্রুপ লাঞ্চ স্টেটমেন্ট - ${data.group.name}`, { align: 'center' })
        .moveDown(0.3);

    // ===== Period Info =====
    doc.fontSize(10)
        .text(`সময়কাল: ${formatDateBn(data.period.startDate)} থেকে ${formatDateBn(data.period.endDate)}`)
        .text(`লাঞ্চ রেট: ৳${data.period.lunchRate} | মোট সদস্য: ${data.members.length} জন`)
        .moveDown();

    // ===== Members Table =====
    const headers = ['ক্র.', 'নাম', 'মিল সংখ্যা', 'মোট চার্জ', 'ব্যালেন্স', 'বকেয়া/অগ্রিম', 'স্ট্যাটাস'];
    const tableData = [headers];

    data.members.forEach((member, idx) => {
        const dueAdvanceText = member.dueAdvance.type === 'due'
            ? `৳${member.dueAdvance.amount} বকেয়া`
            : member.dueAdvance.type === 'advance'
                ? `৳${member.dueAdvance.amount} অগ্রিম`
                : '০';

        tableData.push([
            (idx + 1).toString(),
            member.name,
            member.totalMeals.toString(),
            `৳${member.totalCharge}`,
            `৳${member.balance}`,
            dueAdvanceText,
            member.dueAdvance.type === 'due' ? 'বকেয়া' :
                member.dueAdvance.type === 'advance' ? 'অগ্রিম' : 'সেটেল্ড'
        ]);
    });

    drawTable(doc, tableData, 40, doc.y, [30, 150, 80, 90, 90, 120, 90], true);

    // ===== Summary =====
    doc.moveDown(1.5);
    doc.fontSize(11)
        .text(`মোট মিল: ${data.summary.totalMeals} টি | মোট চার্জ: ৳${data.summary.totalCharge} | মোট বকেয়া: ৳${data.summary.totalDue}`, { align: 'right' });

    // ===== Footer =====
    doc.moveDown(2);
    doc.fontSize(9)
        .fillColor('gray')
        .text(`তৈরির তারিখ: ${new Date().toLocaleString('bn-BD')}`, { align: 'right' })
        .text(`তৈরিকারী: ${data.generatedBy}`, { align: 'right' });

    doc.end();
};

/**
 * Helper function to draw a table
 */
function drawTable(doc, data, x, y, colWidths, hasHeader = false) {
    const rowHeight = 20;
    let currentY = y;

    data.forEach((row, rowIndex) => {
        let currentX = x;
        const isHeader = hasHeader && rowIndex === 0;

        // Check if need new page
        if (currentY + rowHeight > doc.page.height - 50) {
            doc.addPage();
            currentY = 50;
        }

        // Draw row background for header
        if (isHeader) {
            doc.rect(x, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                .fill('#e0e0e0');
            doc.fillColor('black');
        }

        // Draw cells
        row.forEach((cell, colIndex) => {
            // Cell border
            doc.rect(currentX, currentY, colWidths[colIndex], rowHeight).stroke();

            // Cell text
            doc.fontSize(isHeader ? 10 : 9)
                .text(cell || '', currentX + 3, currentY + 5, {
                    width: colWidths[colIndex] - 6,
                    height: rowHeight - 4,
                    ellipsis: true
                });

            currentX += colWidths[colIndex];
        });

        currentY += rowHeight;
    });

    return currentY;
}

/**
 * Format date to Bengali
 */
function formatDateBn(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

module.exports = {
    generateLunchStatementPDF,
    generateGroupLunchStatementPDF
};
