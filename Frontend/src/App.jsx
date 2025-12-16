// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from "jspdf-autotable";

const App = () => {
  // State management
  const [jobs, setJobs] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('newJob');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [newJobForm, setNewJobForm] = useState({
    startRoll: '2301230010',
    endRoll: '2301230141',
    semid: '4',
    session: 'Even-(2024-25)',
    namesMap: {},
    config: {
      concurrency: 2,
      perReqAttempts: 5,
      perReqTimeout: 20000,
      interRequestDelay: 500,
      cycleBackoffBase: 3000,
      maxCycleBackoff: 60000,
      perRollBackoffBase: 2000,
      perRollMaxBackoff: 120000,
      perRollMaxRetries: 10,
      maxCycles: 50,
      universityDownThreshold: 5
    }
  });

  const pollIntervalRef = useRef(null);

  // Polling for job updates - more frequent updates
  useEffect(() => {
    if (currentJob && (currentJob.state === 'queued' || currentJob.state === 'running' || currentJob.state === 'finalizing')) {
      pollIntervalRef.current = setInterval(fetchJobStatus, 2000);
    } else {
      clearInterval(pollIntervalRef.current);
    }

    return () => clearInterval(pollIntervalRef.current);
  }, [currentJob]);

  // Fetch all jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('http://localhost:4000/jobs');
      const jobsData = await response.json();
      setJobs(jobsData);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const fetchJobStatus = async () => {
    if (!currentJob) return;

    try {
      const response = await fetch(`http://localhost:4000/status/${currentJob.jobId}`);
      const jobData = await response.json();

      setCurrentJob(jobData);

      // Update jobs list
      setJobs(prev => prev.map(job =>
        job.jobId === jobData.jobId ? jobData : job
      ));
    } catch (error) {
      console.error('Failed to fetch job status:', error);
    }
  };

  const startNewJob = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:4000/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJobForm)
      });

      const data = await response.json();

      if (response.ok) {
        const job = {
          jobId: data.jobId,
          state: 'queued',
          total: data.total,
          done: 0,
          percent: 0,
          students: [],
          rolls: []
        };
        setCurrentJob(job);
        setJobs(prev => [job, ...prev]);
        setActiveTab('currentJob');
      } else {
        alert('Failed to start job: ' + data.error);
      }
    } catch (error) {
      alert('Failed to start job: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const stopJob = async (jobId) => {
    try {
      await fetch(`http://localhost:4000/stop/${jobId}`, { method: 'POST' });
      fetchJobStatus(); // Refresh status
    } catch (error) {
      console.error('Failed to stop job:', error);
    }
  };

  // Get all unique subjects from students - WITH NAMES
  const getAllSubjects = () => {
    if (!currentJob?.students?.length) return [];

    const subjects = new Map();
    currentJob.students.forEach(student => {
      student.subjects.forEach(subject => {
        const key = `${subject.subjectCODE}|${subject.subjectName}`;
        if (!subjects.has(key)) {
          subjects.set(key, {
            code: subject.subjectCODE,
            name: subject.subjectName,
            credits: subject.subjectCredits
          });
        }
      });
    });

    return Array.from(subjects.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const generatePDF = () => {
    if (!currentJob?.students?.length) {
      alert('No student data available for PDF generation');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });
      const allSubjects = getAllSubjects();

      // Title
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('BPUT RESULTS - SEMESTER ' + newJobForm.semid, 148, 15, { align: 'center' });

      // Subtitle
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${new Date().toLocaleDateString()} | Total Students: ${currentJob.students.length}`, 148, 22, { align: 'center' });

      // Prepare table data
      const tableData = currentJob.students.map((student, index) => {
        const row = [
          (index + 1).toString(),
          student.name,
          student.rollNo
        ];

        // Add subject grades
        allSubjects.forEach(subject => {
          const studentSubject = student.subjects.find(s =>
            s.subjectCODE === subject.code && s.subjectName === subject.name
          );
          row.push(studentSubject ? studentSubject.grade : '-');
        });

        // Add SGPA
        row.push(student.sgpa ? student.sgpa.toFixed(2) : 'N/A');

        return row;
      });

      // Prepare table headers
      const headers = ['Rank', 'Name', 'Roll No', ...allSubjects.map(s => s.name), 'SGPA'];

      // Generate table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 30,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8
        },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          ...Object.fromEntries(allSubjects.map((_, idx) => [3 + idx, { cellWidth: 15 }])),
          [headers.length - 1]: { cellWidth: 25 }
        },
        margin: { top: 30 },
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        tableWidth: 'wrap'
      });


      // Add subject key if there's space
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 30;
      if (finalY < 280) {
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.text('Subject Reference:', 14, finalY + 10);

        let yPos = finalY + 16;
        let xPos = 14;
        allSubjects.forEach((subject, index) => {
          if (index > 0 && index % 3 === 0) {
            yPos += 8;
            xPos = 14;
          }

          doc.setFontSize(7);
          doc.text(`${subject.code}: ${subject.name}`, xPos, yPos);
          xPos += 60;
        });
      }

      doc.save(`bput-results-sem${newJobForm.semid}-${currentJob.jobId.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };


  const downloadCSV = () => {
    if (!currentJob?.students?.length) return;

    const allSubjects = getAllSubjects();
    const headers = ['Rank', 'Name', 'Roll No', ...allSubjects.map(s => s.name), 'SGPA'];

    const csvData = currentJob.students.map((student, index) => {
      const row = [
        index + 1,
        `"${student.name}"`,
        student.rollNo
      ];

      allSubjects.forEach(subject => {
        const studentSubject = student.subjects.find(s =>
          s.subjectCODE === subject.code && s.subjectName === subject.name
        );
        row.push(studentSubject ? studentSubject.grade : '-');
      });

      row.push(student.sgpa ? student.sgpa.toFixed(2) : 'N/A');
      return row;
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-sem${newJobForm.semid}-${currentJob.jobId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (state) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      queued: 'bg-blue-100 text-blue-800',
      running: 'bg-yellow-100 text-yellow-800',
      finalizing: 'bg-purple-100 text-purple-800',
      finished: 'bg-green-100 text-green-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      stopped: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800'
    };
    return colors[state] || 'bg-gray-100 text-gray-800';
  };

  const getGradeColor = (grade) => {
    const colors = {
      'O': 'bg-green-100 text-green-800 border border-green-300',
      'A+': 'bg-blue-100 text-blue-800 border border-blue-300',
      'A': 'bg-indigo-100 text-indigo-800 border border-indigo-300',
      'B+': 'bg-purple-100 text-purple-800 border border-purple-300',
      'B': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      'C': 'bg-orange-100 text-orange-800 border border-orange-300',
      'F': 'bg-red-100 text-red-800 border border-red-300',
      'AB': 'bg-gray-100 text-gray-800 border border-gray-300'
    };
    return colors[grade] || 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  // Render roll status list
  const renderRollList = () => {
    if (!currentJob?.rolls?.length && !currentJob?.students?.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          No data available yet. Waiting for results...
        </div>
      );
    }

    // Combine rolls from status and successful students
    const allRolls = [];

    // Add successful students first
    if (currentJob.students && currentJob.students.length > 0) {
      allRolls.push(...currentJob.students.map(student => ({
        roll: student.rollNo,
        status: 'success',
        student
      })));
    }

    // Add pending/failed rolls if available
    if (currentJob.rolls) {
      currentJob.rolls.forEach(rollData => {
        if (!allRolls.find(r => r.roll === rollData.roll)) {
          allRolls.push({
            roll: rollData.roll,
            status: rollData.status || 'pending',
            student: rollData.student || null
          });
        }
      });
    }

    // Sort by roll number
    allRolls.sort((a, b) => a.roll.localeCompare(b.roll));

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SGPA
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allRolls.map((rollData) => (
                <React.Fragment key={rollData.roll}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rollData.status)}`}>
                        {rollData.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {rollData.roll}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {rollData.student?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                      {rollData.student?.sgpa ? rollData.student.sgpa.toFixed(2) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {rollData.student && (
                        <button
                          onClick={() => setExpandedStudent(expandedStudent === rollData.roll ? null : rollData.roll)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {expandedStudent === rollData.roll ? '▲ Hide Details' : '▼ View Details'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedStudent === rollData.roll && rollData.student && (
                    <tr className="bg-gray-50">
                      <td colSpan="5" className="px-4 py-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-lg text-gray-900">{rollData.student.name}</h4>
                              <p className="text-gray-600">{rollData.roll} • {rollData.student.details?.branchName}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">
                                {rollData.student.sgpa ? rollData.student.sgpa.toFixed(2) : 'N/A'}
                              </div>
                              <div className="text-sm text-gray-600">SGPA</div>
                            </div>
                          </div>

                          <h5 className="font-semibold text-gray-900 mb-3">Subjects:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {rollData.student.subjects.map((subject, idx) => (
                              <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm text-gray-900 truncate">
                                      {subject.subjectName}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      Code: {subject.subjectCODE}
                                    </div>
                                  </div>
                                  <span className={`ml-2 px-3 py-1 rounded text-sm font-bold ${getGradeColor(subject.grade)}`}>
                                    {subject.grade}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-2">
                                  <span>Credits: {subject.subjectCredits}</span>
                                  <span>Points: {subject.points || 'N/A'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BPUT Results Harvester</h1>
                <p className="text-sm text-gray-600">Real-time results fetching and monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex overflow-x-auto">
          {[
            { id: 'newJob', label: 'New Job', icon: '📥' },
            { id: 'currentJob', label: 'Current Job', icon: '⚡' },
            { id: 'jobs', label: 'All Jobs', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* New Job Tab - Keep as is */}
        {activeTab === 'newJob' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Start Results Harvest</h2>

              <form onSubmit={startNewJob} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Roll Number
                    </label>
                    <input
                      type="text"
                      required
                      value={newJobForm.startRoll}
                      onChange={(e) => setNewJobForm(prev => ({ ...prev, startRoll: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="2301230010"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Roll Number
                    </label>
                    <input
                      type="text"
                      required
                      value={newJobForm.endRoll}
                      onChange={(e) => setNewJobForm(prev => ({ ...prev, endRoll: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="2301230141"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester
                    </label>
                    <select
                      value={newJobForm.semid}
                      onChange={(e) => setNewJobForm(prev => ({ ...prev, semid: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <option key={sem} value={sem.toString()}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Session
                    </label>
                    <input
                      type="text"
                      value={newJobForm.session}
                      onChange={(e) => setNewJobForm(prev => ({ ...prev, session: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Even-(2024-25)"
                    />
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">Recommended Settings</h3>
                  <p className="text-sm text-yellow-700">
                    Using optimized settings for better success rate. Lower concurrency and higher timeouts for stability.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50"
                >
                  {loading ? 'Starting Harvest...' : 'Start Harvesting Results'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Current Job Tab - Updated */}
        {activeTab === 'currentJob' && currentJob && (
          <div className="space-y-6">
            {/* Job Status Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Current Harvest Job</h2>
                  <p className="text-sm text-gray-600">Job ID: {currentJob.jobId?.slice(0, 8)}...</p>
                </div>
                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(currentJob.state)}`}>
                    {currentJob.state.toUpperCase()}
                  </span>
                  {currentJob.universityDown && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      UNIVERSITY DOWN
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress: {currentJob.done}/{currentJob.total}</span>
                  <span>{currentJob.percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${currentJob.percent}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{currentJob.cycle}</div>
                  <div className="text-xs text-blue-800">Cycles</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{currentJob.done}</div>
                  <div className="text-xs text-green-800">Completed</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{currentJob.failed?.length || 0}</div>
                  <div className="text-xs text-yellow-800">Failed</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{currentJob.total}</div>
                  <div className="text-xs text-purple-800">Total</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {(currentJob.state === 'running' || currentJob.state === 'queued') && (
                  <button
                    onClick={() => stopJob(currentJob.jobId)}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Stop Harvest
                  </button>
                )}
                {currentJob.students && currentJob.students.length > 0 && (
                  <>
                    <button
                      onClick={generatePDF}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={downloadCSV}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Download CSV
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Results Display - ALWAYS SHOW if there's data */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Results ({currentJob.students?.length || 0} fetched)
                </h3>
                {currentJob.students && currentJob.students.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Sorted by SGPA (Highest First)
                  </div>
                )}
              </div>
              {renderRollList()}
            </div>

            {/* Subject Summary */}
            {currentJob.students && currentJob.students.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Subjects in This Semester</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getAllSubjects().map(subject => (
                    <div key={`${subject.code}|${subject.name}`} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="font-medium text-gray-900 truncate">{subject.name}</div>
                      <div className="text-sm text-gray-600">Code: {subject.code}</div>
                      <div className="text-xs text-gray-500">Credits: {subject.credits}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Rolls */}
            {currentJob.failed && currentJob.failed.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">❌ Failed Attempts ({currentJob.failed.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {currentJob.failed.map((failedItem) => (
                    <div key={failedItem.roll} className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200">
                      <div>
                        <span className="font-medium text-red-800">{failedItem.roll}</span>
                        <div className="text-xs text-red-600 truncate">{failedItem.lastErr}</div>
                      </div>
                      <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded">
                        {failedItem.attempts} attempts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Jobs Tab - Keep as is */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">All Harvest Jobs</h2>
            {jobs.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="text-gray-400 mb-2">No jobs found</div>
                <p className="text-sm text-gray-600">Start a new harvest job to see it here</p>
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.jobId} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Job {job.jobId?.slice(0, 8)}...</div>
                      <div className="text-sm text-gray-600">
                        {job.done}/{job.total} completed • {new Date(job.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.state)}`}>
                        {job.state}
                      </span>
                      <button
                        onClick={() => {
                          setCurrentJob(job);
                          setActiveTab('currentJob');
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                  {job.percent > 0 && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${job.percent}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Empty State for Current Job */}
        {activeTab === 'currentJob' && !currentJob && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-400 mb-3">No active harvest job</div>
            <p className="text-sm text-gray-600 mb-4">Start a new job to begin fetching results</p>
            <button
              onClick={() => setActiveTab('newJob')}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start New Harvest
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;