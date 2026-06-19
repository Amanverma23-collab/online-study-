const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createPdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const questions = [
    {
      q: "1. Who was the first President of India?",
      opts: ["A. Dr. Rajendra Prasad", "B. Dr. S. Radhakrishnan", "C. Pranab Mukherjee", "D. Zakir Husain"]
    },
    {
      q: "2. The National Defence Academy (NDA) is located at:",
      opts: ["A. Dehradun", "B. Khadakwasla, Pune", "C. New Delhi", "D. Chennai"]
    },
    {
      q: "3. Which of the following is the highest peacetime military decoration in India?",
      opts: ["A. Param Vir Chakra", "B. Ashok Chakra", "C. Shaurya Chakra", "D. Kirti Chakra"]
    },
    {
      q: "4. The Battle of Plassey was fought in the year:",
      opts: ["A. 1757", "B. 1764", "C. 1782", "D. 1857"]
    },
    {
      q: "5. Which planet is known as the Red Planet?",
      opts: ["A. Venus", "B. Mars", "C. Jupiter", "D. Saturn"]
    },
    {
      q: "6. The Indian Military Academy (IMA) is located in:",
      opts: ["A. Pune", "B. Gaya", "C. Dehradun", "D. Kochi"]
    },
    {
      q: "7. What is the chemical symbol for Gold?",
      opts: ["A. Ag", "B. Au", "C. Fe", "D. Cu"]
    },
    {
      q: "8. Which river is known as the 'Ganges of the South'?",
      opts: ["A. Godavari", "B. Krishna", "C. Kaveri", "D. Narmada"]
    },
    {
      q: "9. The headquarters of the Indian Army is located in:",
      opts: ["A. Mumbai", "B. Kolkata", "C. New Delhi", "D. Pune"]
    },
    {
      q: "10. The first Indian satellite 'Aryabhata' was launched in:",
      opts: ["A. 1975", "B. 1980", "C. 1969", "D. 1983"]
    }
  ];

  let page = pdfDoc.addPage([600, 850]);
  let y = 800;
  const x = 50;

  // Draw Header
  page.drawText("OFFICERS SAGA - MOCK TEST BRIEFING", {
    x,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0.08, 0.1, 0.15)
  });
  y -= 22;

  page.drawText("NDA & CDS Officer Candidate Assessment Paper", {
    x,
    y,
    size: 11,
    font: font,
    color: rgb(0.5, 0.5, 0.5)
  });
  y -= 40;

  for (let i = 0; i < questions.length; i++) {
    const item = questions[i];
    
    // Add page if spacing is low
    if (y < 120) {
      page = pdfDoc.addPage([600, 850]);
      y = 800;
      page.drawText(`OFFICERS SAGA - MOCK TEST (CONTINUED)`, {
        x,
        y,
        size: 10,
        font: boldFont,
        color: rgb(0.5, 0.5, 0.5)
      });
      y -= 30;
    }

    // Draw question
    page.drawText(item.q, {
      x,
      y,
      size: 11,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1)
    });
    y -= 18;

    // Draw options
    for (const opt of item.opts) {
      page.drawText(opt, {
        x: x + 15,
        y,
        size: 10,
        font: font,
        color: rgb(0.2, 0.2, 0.2)
      });
      y -= 15;
    }
    y -= 12; // spacer between questions
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, 'sample-10-questions.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log("PDF Created Successfully at:", outputPath);
}

createPdf().catch(console.error);
