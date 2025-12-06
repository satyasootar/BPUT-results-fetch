// src/utils/grades.js
import { GRADE_RANGES } from "../constants/config";

export const calculateGrade = (marks) => {
  const numMarks = parseFloat(marks);
  if (isNaN(numMarks)) return "N/A";

  for (const range of GRADE_RANGES) {
    if (numMarks >= range.min && numMarks <= range.max) {
      return range.grade;
    }
  }

  return "F";
};

export const calculateGradePoint = (marks) => {
  const numMarks = parseFloat(marks);
  if (isNaN(numMarks)) return 0;

  for (const range of GRADE_RANGES) {
    if (numMarks >= range.min && numMarks <= range.max) {
      return range.point;
    }
  }

  return 0;
};

export const calculateSGPA = (subjects) => {
  if (!subjects || subjects.length === 0) return 0;

  let totalCredits = 0;
  let totalPoints = 0;

  for (const subject of subjects) {
    const credits = parseFloat(subject.credits) || 0;
    const gradePoint = calculateGradePoint(subject.marks) || 0;
    totalCredits += credits;
    totalPoints += gradePoint * credits;
  }

  if (totalCredits === 0) return 0;
  return (totalPoints / totalCredits).toFixed(2);
};

export const getGradeColor = (grade) => {
  switch (grade) {
    case "O":
      return "#27ae60";
    case "E":
      return "#2ecc71";
    case "A":
      return "#3498db";
    case "B":
      return "#f39c12";
    case "C":
      return "#e67e22";
    case "D":
      return "#e74c3c";
    case "F":
      return "#c0392b";
    default:
      return "#95a5a6";
  }
};

export const formatGradeData = (subjects) => {
  return subjects.map((subject) => ({
    ...subject,
    grade: calculateGrade(subject.marks),
    gradePoint: calculateGradePoint(subject.marks),
  }));
};
