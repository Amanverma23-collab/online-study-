import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const testId = params.id;

    const test = await db.test.findUnique({
      where: { id: testId },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Calculate totalMarks from sections
    let totalMarks = 0;
    for (const sec of test.sections) {
      const qCount = await db.question.count({ where: { sectionId: sec.id } });
      totalMarks += qCount * sec.marksPerQ;
    }

    const attempts = await db.attempt.findMany({
      where: { testId, submittedAt: { not: null } },
      include: {
        student: true,
        sectionResults: { include: { section: true } },
      },
      orderBy: { rank: "asc" },
    });

    const maxSec = test.duration * 60;

    // Format time helper
    const formatTime = (sec: number) => {
      const mins = Math.floor(sec / 60);
      const secs = sec % 60;
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const marginX = 40;
    const pageWidth = 841.89; // A4 landscape
    const pageHeight = 595.28;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 40;

    const drawText = (text: string, x: number, yPos: number, font: any, size: number, color = rgb(0, 0, 0)) => {
      page.drawText(text, { x, y: yPos, font, size, color });
    };

    // Header - Officers Saga
    const headerText = "OFFICERS SAGA";
    const headerWidth = helveticaBold.widthOfTextAtSize(headerText, 24);
    drawText(headerText, (pageWidth - headerWidth) / 2, y, helveticaBold, 24, rgb(0.3, 0.45, 0.2));
    y -= 18;

    const subText = "Online NDA & CDS Test Prep Platform";
    const subWidth = helvetica.widthOfTextAtSize(subText, 10);
    drawText(subText, (pageWidth - subWidth) / 2, y, helvetica, 10, rgb(0.55, 0.62, 0.42));
    y -= 24;

    // Horizontal line
    page.drawLine({
      start: { x: marginX, y },
      end: { x: pageWidth - marginX, y },
      thickness: 1.5,
      color: rgb(0.3, 0.45, 0.2),
    });
    y -= 22;

    // Test Title
    drawText("TEST RESULTS", marginX, y, helveticaBold, 16, rgb(0.05, 0.06, 0.07));
    y -= 20;

    drawText(`Test: ${test.title}`, marginX, y, helveticaBold, 12, rgb(0.1, 0.1, 0.1));
    y -= 16;

    drawText(`Total Marks: ${totalMarks}    |    Duration: ${test.duration} mins    |    Candidates: ${attempts.length}`, marginX, y, helvetica, 10, rgb(0.35, 0.35, 0.35));
    y -= 16;

    const now = new Date();
    drawText(`Generated: ${now.toLocaleDateString("en-IN")} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`, marginX, y, helvetica, 9, rgb(0.5, 0.5, 0.5));
    y -= 22;

    // Table
    const colDefs: { label: string; width: number; align: "left" | "center" | "right" }[] = [
      { label: "Rank", width: 36, align: "center" },
      { label: "Student Name", width: 130, align: "left" },
      { label: "Father's Name", width: 120, align: "left" },
      { label: "Mobile", width: 85, align: "left" },
      { label: "Score", width: 52, align: "center" },
      { label: "Correct", width: 50, align: "center" },
      { label: "Wrong", width: 45, align: "center" },
      { label: "Unattempted", width: 65, align: "center" },
      { label: "Accuracy", width: 55, align: "center" },
      { label: "Time", width: 48, align: "center" },
    ];

    const totalColWidth = colDefs.reduce((s, c) => s + c.width, 0);
    const scaleFactor = (pageWidth - 2 * marginX) / totalColWidth;

    const scaledCols = colDefs.map((c) => ({
      ...c,
      scaledWidth: c.width * scaleFactor,
    }));

    let tableX = marginX;
    const rowHeight = 18;

    // Draw table header background
    page.drawRectangle({
      x: marginX,
      y: y - 12,
      width: (pageWidth - 2 * marginX),
      height: rowHeight,
      color: rgb(0.08, 0.14, 0.08),
    });

    // Draw header text
    let headerX = marginX + 4;
    scaledCols.forEach((col) => {
      const textWidth = helveticaBold.widthOfTextAtSize(col.label, 8);
      let textX = headerX;
      if (col.align === "center") textX = headerX + (col.scaledWidth - textWidth) / 2;
      else if (col.align === "right") textX = headerX + col.scaledWidth - textWidth - 4;
      drawText(col.label, textX, y - 5, helveticaBold, 8, rgb(0.9, 0.95, 0.9));
      headerX += col.scaledWidth;
    });
    y -= rowHeight + 2;

    // Draw rows
    const drawRow = (rowY: number, isAlt: boolean) => {
      if (isAlt) {
        page.drawRectangle({
          x: marginX,
          y: rowY - 10,
          width: pageWidth - 2 * marginX,
          height: rowHeight,
          color: rgb(0.96, 0.95, 0.92),
        });
      }
      // Bottom border
      page.drawLine({
        start: { x: marginX, y: rowY - 10 },
        end: { x: pageWidth - marginX, y: rowY - 10 },
        thickness: 0.3,
        color: rgb(0.85, 0.83, 0.8),
      });
    };

    for (let i = 0; i < attempts.length; i++) {
      if (y < 60) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - 40;

        // Re-draw header on new page
        drawText("OFFICERS SAGA", marginX, y, helveticaBold, 14, rgb(0.3, 0.45, 0.2));
        y -= 16;
        drawText(`Test: ${test.title} (Continued)`, marginX, y, helvetica, 10, rgb(0.35, 0.35, 0.35));
        y -= 18;

        page.drawLine({
          start: { x: marginX, y },
          end: { x: pageWidth - marginX, y },
          thickness: 1,
          color: rgb(0.3, 0.45, 0.2),
        });
        y -= 16;

        // Redraw header row
        page.drawRectangle({
          x: marginX,
          y: y - 12,
          width: pageWidth - 2 * marginX,
          height: rowHeight,
          color: rgb(0.08, 0.14, 0.08),
        });
        let hX = marginX + 4;
        scaledCols.forEach((col) => {
          const textWidth = helveticaBold.widthOfTextAtSize(col.label, 8);
          let textX = hX;
          if (col.align === "center") textX = hX + (col.scaledWidth - textWidth) / 2;
          else if (col.align === "right") textX = hX + col.scaledWidth - textWidth - 4;
          drawText(col.label, textX, y - 5, helveticaBold, 8, rgb(0.9, 0.95, 0.9));
          hX += col.scaledWidth;
        });
        y -= rowHeight + 2;
      }

      const att = attempts[i];
      let correct = 0;
      let incorrect = 0;
      let unattempted = 0;
      att.sectionResults.forEach((sr) => {
        correct += sr.correct;
        incorrect += sr.wrong;
        unattempted += sr.unattempted;
      });

      const started = new Date(att.startedAt).getTime();
      const submitted = new Date(att.submittedAt!).getTime();
      let timeSpent = Math.floor((submitted - started) / 1000);
      if (timeSpent > maxSec) timeSpent = maxSec;

      const accuracy = correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;

      const values: string[] = [
        String(att.rank || i + 1),
        att.student.name,
        att.student.fatherName,
        att.student.mobile,
        (att.totalScore || 0).toFixed(2),
        String(correct),
        String(incorrect),
        String(unattempted),
        `${accuracy}%`,
        formatTime(timeSpent),
      ];

      drawRow(y, i % 2 === 0);

      let cellX = marginX + 4;
      scaledCols.forEach((col, ci) => {
        const val = values[ci];
        const textWidth = helvetica.widthOfTextAtSize(val, 8);
        let textX = cellX;
        if (col.align === "center") textX = cellX + (col.scaledWidth - textWidth) / 2;
        else if (col.align === "right") textX = cellX + col.scaledWidth - textWidth - 4;
        drawText(val, textX, y - 5, helvetica, 8, rgb(0.1, 0.1, 0.1));
        cellX += col.scaledWidth;
      });

      y -= rowHeight;
    }

    // Footer on last page
    y -= 16;
    page.drawLine({
      start: { x: marginX, y },
      end: { x: pageWidth - marginX, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 12;
    const footerText = "Officers Saga - Confidential Results Report";
    const footerWidth = helvetica.widthOfTextAtSize(footerText, 7);
    drawText(footerText, (pageWidth - footerWidth) / 2, y, helvetica, 7, rgb(0.6, 0.6, 0.6));

    // Serialize
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=results_${test.title.replace(/\s+/g, "_")}.pdf`,
      },
    });
  } catch (error: any) {
    console.error("Export PDF Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
