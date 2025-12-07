const { describe, it, expect } = require('@jest/globals');
const { 
    sleep, 
    expandRange, 
    randomDobBetweenYears, 
    formatDob, 
    normalizeStudent 
} = require('../../src/utils');

describe('Utils', () => {
    describe('expandRange', () => {
        it('should expand numeric range', () => {
            const result = expandRange('1001', '1003');
            expect(result).toEqual(['1001', '1002', '1003']);
        });

        it('should handle comma-separated rolls', () => {
            const result = expandRange('1001,1003,1005', '');
            expect(result).toEqual(['1001', '1003', '1005']);
        });

        it('should preserve padding', () => {
            const result = expandRange('0010', '0012');
            expect(result).toEqual(['0010', '0011', '0012']);
        });
    });

    describe('randomDobBetweenYears', () => {
        it('should generate date in correct format', () => {
            const dob = randomDobBetweenYears(2000, 2000);
            expect(dob).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            const year = parseInt(dob.split('-')[0]);
            expect(year).toBe(2000);
        });

        it('should generate dates within range', () => {
            for (let i = 0; i < 10; i++) {
                const dob = randomDobBetweenYears(2004, 2005);
                const year = parseInt(dob.split('-')[0]);
                expect(year).toBeGreaterThanOrEqual(2004);
                expect(year).toBeLessThanOrEqual(2005);
            }
        });
    });

    describe('formatDob', () => {
        it('should format Date object', () => {
            const date = new Date('2000-01-15');
            const result = formatDob(date);
            expect(result).toBe('2000-01-15');
        });

        it('should format string date', () => {
            const result = formatDob('2000-01-15T00:00:00.000Z');
            expect(result).toBe('2000-01-15');
        });

        it('should handle invalid date gracefully', () => {
            const result = formatDob('invalid-date');
            expect(result).toBe('invalid-date');
        });
    });

    describe('normalizeStudent', () => {
        it('should normalize student data', () => {
            const student = normalizeStudent(
                '2301230010',
                { sgpa: 8.5, totalGradePoints: 100 },
                [
                    {
                        subjectCODE: 'CS401',
                        subjectName: 'Data Structures',
                        subjectCredits: 4,
                        grade: 'A',
                        points: 8
                    }
                ],
                {
                    studentName: 'John Doe',
                    branchName: 'Computer Science',
                    dob: '2001-01-15'
                },
                {}
            );

            expect(student.rollNo).toBe('2301230010');
            expect(student.name).toBe('John Doe');
            expect(student.sgpa).toBe(8.5);
            expect(student.totalGradePoints).toBe(100);
            expect(student.subjects).toHaveLength(1);
            expect(student.subjects[0].subjectCODE).toBe('CS401');
            expect(student.details.dob).toBe('2001-01-15');
        });

        it('should use namesMap if provided', () => {
            const namesMap = { '2301230010': 'Custom Name' };
            const student = normalizeStudent(
                '2301230010',
                { sgpa: 8.5 },
                [],
                { studentName: 'John Doe' },
                namesMap
            );

            expect(student.name).toBe('Custom Name');
        });

        it('should generate random DOB if not provided', () => {
            const student = normalizeStudent(
                '2301230010',
                { sgpa: 8.5 },
                [],
                {},
                {}
            );

            expect(student.details.dob).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('sleep', () => {
        it('should sleep for specified time', async () => {
            const start = Date.now();
            await sleep(100);
            const end = Date.now();
            expect(end - start).toBeGreaterThanOrEqual(95);
        });
    });
});