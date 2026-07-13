import * as XLSX from 'xlsx';

// 1. Export current database to Excel
export const exportToExcel = (devices) => {
    // Map our data to look nice in Excel columns, now including Site and Category
    const excelData = devices.map(d => ({
        'Device Name': d.name,
        'IP Address': d.ip_address,
        'Site': d.site,
        'Category': d.category,
        'Current Status': d.status.toUpperCase()
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AMR Meters");
    XLSX.writeFile(workbook, "Live_Meter_Status.xlsx");
};

// 2. Download a blank template for the user to fill out
export const downloadTemplate = () => {
    // Updated template with valid site names and categories from your list
    const templateData = [
        { 'Device Name': 'Main Trafo Kertasari', 'IP Address': '192.168.1.100', 'Site': 'GI Kertasari', 'Category': 'Trafo' },
        { 'Device Name': 'Feeder 1 Labuhan', 'IP Address': '192.168.1.101', 'Site': 'GI Labuhan', 'Category': 'Feeder' },
        { 'Device Name': 'Incoming Woha', 'IP Address': '192.168.1.102', 'Site': 'GI Woha', 'Category': 'Incoming' }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import Template");
    XLSX.writeFile(workbook, "Meter_Import_Template.xlsx");
};

// 3. Read an uploaded Excel file and format it for our backend
export const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                
                // Convert Excel column names back to our database format
                const formattedData = rawData.map(row => ({
                    name: row['Device Name'],
                    ip_address: row['IP Address'],
                    site: row['Site'] || 'GI Sumbawa', // Fallback if left blank
                    category: row['Category'] || 'Feeder' // Fallback if left blank
                }));
                
                resolve(formattedData);
            } catch (err) {
                reject("Failed to parse Excel file.");
            }
        };
        
        reader.onerror = () => reject("Failed to read file.");
        reader.readAsBinaryString(file);
    });
};