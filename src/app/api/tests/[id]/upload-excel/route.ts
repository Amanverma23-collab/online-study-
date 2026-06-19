import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Read the workbook and get first sheet
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Parse as 2D array of rows
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Excel sheet is empty" }, { status: 400 });
    }

    // Try to find header row and map columns
    let headerIndex = -1;
    let colMap = {
      questionText: -1,
      optionA: -1,
      optionB: -1,
      optionC: -1,
      optionD: -1,
      correctOption: -1,
      explanation: -1,
      order: -1
    };

    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const row = rows[r];
      if (!row) continue;
      let foundHeaders = 0;
      
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").toLowerCase().trim();
        if (val.includes("question") || val === "q" || val === "ques" || val === "questiontext" || val === "mcq") {
          colMap.questionText = c;
          foundHeaders++;
        } else if (val.includes("option a") || val === "a" || val === "opt a" || val === "optiona") {
          colMap.optionA = c;
          foundHeaders++;
        } else if (val.includes("option b") || val === "b" || val === "opt b" || val === "optionb") {
          colMap.optionB = c;
          foundHeaders++;
        } else if (val.includes("option c") || val === "c" || val === "opt c" || val === "optionc") {
          colMap.optionC = c;
          foundHeaders++;
        } else if (val.includes("option d") || val === "d" || val === "opt d" || val === "optiond") {
          colMap.optionD = c;
          foundHeaders++;
        } else if (val.includes("correct") || val === "answer" || val === "ans" || val === "key" || val === "correctoption") {
          colMap.correctOption = c;
          foundHeaders++;
        } else if (val.includes("explanation") || val === "exp" || val === "solution" || val === "sol" || val === "explanationtext") {
          colMap.explanation = c;
          foundHeaders++;
        } else if (val.includes("order") || val === "sn" || val === "s.no" || val === "no" || val === "index") {
          colMap.order = c;
          foundHeaders++;
        }
      }

      if (foundHeaders >= 5) {
        headerIndex = r;
        break;
      }
    }

    const startRow = headerIndex !== -1 ? headerIndex + 1 : 0;
    const questions: any[] = [];
    let orderCounter = 1;

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      let questionText = "";
      let optionA = "";
      let optionB = "";
      let optionC = "";
      let optionD = "";
      let correctOption = "";
      let explanation = "";
      let orderVal = orderCounter;

      if (headerIndex !== -1) {
        questionText = colMap.questionText !== -1 ? String(row[colMap.questionText] || "").trim() : "";
        optionA = colMap.optionA !== -1 ? String(row[colMap.optionA] || "").trim() : "";
        optionB = colMap.optionB !== -1 ? String(row[colMap.optionB] || "").trim() : "";
        optionC = colMap.optionC !== -1 ? String(row[colMap.optionC] || "").trim() : "";
        optionD = colMap.optionD !== -1 ? String(row[colMap.optionD] || "").trim() : "";
        
        const rawCorrect = colMap.correctOption !== -1 ? String(row[colMap.correctOption] || "").trim().toUpperCase() : "";
        if (["A", "B", "C", "D"].includes(rawCorrect)) {
          correctOption = rawCorrect;
        } else {
          const match = rawCorrect.match(/^[A-D]\b/i);
          correctOption = match ? match[0].toUpperCase() : "";
        }

        explanation = colMap.explanation !== -1 ? String(row[colMap.explanation] || "").trim() : "";
        if (colMap.order !== -1 && row[colMap.order] !== undefined) {
          orderVal = parseInt(String(row[colMap.order]).trim()) || orderCounter;
        }
      } else {
        const isCol0Num = !isNaN(Number(row[0])) && String(row[0]).trim() !== "";
        let offset = isCol0Num ? 1 : 0;
        
        questionText = String(row[offset] || "").trim();
        optionA = String(row[offset + 1] || "").trim();
        optionB = String(row[offset + 2] || "").trim();
        optionC = String(row[offset + 3] || "").trim();
        optionD = String(row[offset + 4] || "").trim();
        
        const rawCorrect = String(row[offset + 5] || "").trim().toUpperCase();
        if (["A", "B", "C", "D"].includes(rawCorrect)) {
          correctOption = rawCorrect;
        } else {
          const match = rawCorrect.match(/^[A-D]\b/i);
          correctOption = match ? match[0].toUpperCase() : "";
        }
        
        explanation = String(row[offset + 6] || "").trim();
        if (isCol0Num) {
          orderVal = parseInt(String(row[0]).trim()) || orderCounter;
        }
      }

      // Skip row if it doesn't have at least a question text and option A
      if (!questionText || !optionA) continue;

      questions.push({
        order: orderVal,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        explanation
      });

      orderCounter = Math.max(orderCounter, orderVal) + 1;
    }

    // Sort by order
    questions.sort((a, b) => a.order - b.order);

    return NextResponse.json({
      success: true,
      message: `Extracted ${questions.length} questions from Excel.`,
      questions
    });
  } catch (error: any) {
    console.error("Upload Excel Route Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
