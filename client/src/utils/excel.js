import * as ExcelJS from 'exceljs';

// Helper untuk download file tanpa library tambahan
const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

export const exportToExcel = async (devices) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("AMR Meters");

    worksheet.columns = [
        { header: 'Device Name', key: 'name', width: 25 },
        { header: 'IP Address', key: 'ip_address', width: 20 },
        { header: 'Site', key: 'site', width: 20 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Current Status', key: 'status', width: 20 }
    ];

    devices.forEach(d => {
        worksheet.addRow({
            name: d.name,
            ip_address: d.ip_address,
            site: d.site,
            category: d.category,
            status: d.status?.toUpperCase() || 'OFFLINE'
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    downloadFile(blob, "Live_Meter_Status.xlsx");
};

export const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Import Template");

    worksheet.columns = [
        { header: 'Device Name', key: 'name', width: 25 },
        { header: 'IP Address', key: 'ip_address', width: 20 },
        { header: 'Site', key: 'site', width: 20 },
        { header: 'Category', key: 'category', width: 20 }
    ];

    worksheet.addRows([
        { name: 'Main Trafo Kertasari', ip_address: '192.168.1.100', site: 'GI Kertasari', category: 'Trafo' },
        { name: 'Feeder 1 Labuhan', ip_address: '192.168.1.101', site: 'GI Labuhan', category: 'Feeder' },
        { name: 'Incoming Woha', ip_address: '192.168.1.102', site: 'GI Woha', category: 'Incoming' }
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    downloadFile(blob, "Meter_Import_Template.xlsx");
};

export const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(e.target.result);
                const worksheet = workbook.worksheets[0];
                const formattedData = [];
                worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    if (rowNumber > 1) {
                        formattedData.push({
                            name: row.getCell(1).value,
                            ip_address: row.getCell(2).value,
                            site: row.getCell(3).value || 'GI Sumbawa',
                            category: row.getCell(4).value || 'Feeder'
                        });
                    }
                });
                resolve(formattedData);
            } catch (err) {
                reject("Failed to parse Excel file.");
            }
        };
        reader.onerror = () => reject("Failed to read file.");
        reader.readAsArrayBuffer(file);
    });
};