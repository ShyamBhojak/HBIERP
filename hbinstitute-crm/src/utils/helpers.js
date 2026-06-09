export const getCurrentMonthYear = () => {
  const now = new Date();
  return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

export const formatLongDate = (dateInput) => {
  if (!dateInput) return 'N/A';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const day = d.toLocaleDateString('en-US', { day: '2-digit' });
  const year = d.getFullYear();

  return `${weekday} ${month} ${day}, ${year}`;
};

export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert("No records available to export.");
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      if (Array.isArray(value)) return `"${value.join(', ')}"`;
      return `"${value ?? ''}"`;
    });
    csvRows.push(values.join(','));
  });

  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_${new Date().toLocaleDateString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};