// src/utils/csv.js
export const exportToCSV = (data, filename = "results.csv") => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csv = [headers.map((h) => `"${h}"`).join(",")];

  for (const row of data) {
    const values = headers.map((h) => {
      const value = row[h];
      if (value === null || value === undefined) return "";
      if (typeof value === "string" && value.includes(",")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    csv.push(values.join(","));
  }

  const csvContent = csv.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadFile(blob, filename);
};

export const parseCSV = (csvText) => {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    data.push(row);
  }

  return data;
};

const parseCSVLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
