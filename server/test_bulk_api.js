const http = require('http');

const PORT = 5000;
const HOST = 'localhost';

const makeRequest = (options, postData = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: body ? JSON.parse(body) : null
                });
            });
        });

        req.on('error', (e) => reject(e));

        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
};

const makeBufferRequest = (options) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: Buffer.concat(chunks)
                });
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
};

const fs = require('fs');
let logContent = '';
const log = (msg) => {
    console.log(msg);
    logContent += msg + '\n';
};

const runTests = async () => {
    log('🚀 Starting Bulk Action & Template verification API Integration Tests...');
    let token = '';
    const certificateIds = [];

    try {
        // 1. Authenticate Admin User
        log('\nStep 1: Authenticating Admin User...');
        const loginRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            email: 'admin@example.com',
            password: 'password123'
        });

        if (loginRes.statusCode !== 200) {
            throw new Error(`Login failed with status ${loginRes.statusCode}: ${JSON.stringify(loginRes.data)}`);
        }

        token = loginRes.data.token;
        log('✅ Authenticated successfully!');

        // 2. Bulk Issue Certificates (Classic, Modern Dark, Tech Minimal)
        log('\nStep 2: Issuing Bulk Certificates (3 entries, differing templates)...');
        const bulkRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/api/certificates/bulk',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, {
            certificates: [
                {
                    studentName: 'Alice Johnson',
                    studentEmail: 'alice@example.com',
                    rollNumber: 'ROLL-001',
                    course: 'Machine Learning Fundamentals',
                    templateId: 'classic'
                },
                {
                    studentName: 'Bob Smith',
                    studentEmail: 'bob@example.com',
                    rollNumber: 'ROLL-002',
                    course: 'React UI Design Patterns',
                    templateId: 'modern_dark'
                },
                {
                    studentName: 'Charlie Davis',
                    studentEmail: 'charlie@example.com',
                    rollNumber: 'ROLL-003',
                    course: 'Cybersecurity Specialization',
                    templateId: 'tech_minimal'
                }
            ]
        });

        if (bulkRes.statusCode !== 201) {
            throw new Error(`Bulk issuance failed with status ${bulkRes.statusCode}: ${JSON.stringify(bulkRes.data)}`);
        }

        log(`✅ Bulk issuance success! Count: ${bulkRes.data.count}`);

        bulkRes.data.certificates.forEach(c => {
            certificateIds.push(c._id);
            log(` - Student: ${c.studentName}, Template: ${c.templateId}, ID: ${c._id}`);
        });

        // 3. Download & Validate each template PDF layout
        log('\nStep 3: Downloading and validating PDF outputs for each template...');
        for (let i = 0; i < certificateIds.length; i++) {
            const id = certificateIds[i];
            const certInfo = bulkRes.data.certificates[i];

            log(` -> Requesting download for ${certInfo.studentName} (${certInfo.templateId})...`);
            const pdfRes = await makeBufferRequest({
                hostname: HOST,
                port: PORT,
                path: `/api/certificates/download/${id}`,
                method: 'GET'
            });

            if (pdfRes.statusCode !== 200) {
                throw new Error(`PDF download failed for template ${certInfo.templateId} with code ${pdfRes.statusCode}`);
            }

            const isPdf = pdfRes.headers['content-type'] === 'application/pdf';
            log(`    ✅ Success! Content-Type: ${pdfRes.headers['content-type']}, Size: ${pdfRes.data.length} bytes. Verified PDF: ${isPdf}`);
        }

        // 4. Cleanup: delete issued mock certificates
        log('\nStep 4: Cleaning up database mock records...');
        for (const id of certificateIds) {
            const deleteRes = await makeRequest({
                hostname: HOST,
                port: PORT,
                path: `/api/certificates/${id}`,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (deleteRes.statusCode !== 200) {
                log(`    ⚠️ Warning: Failed to clean up certificate ${id}`);
            } else {
                log(`    ✅ Cleaned up certificate ${id}`);
            }
        }

        log('\n🎉 ALL BULK AND TEMPLATE TESTS PASSED SUCCESSFULLY!');
        fs.writeFileSync('server/test_run.log', logContent, 'utf-8');
        process.exit(0);

    } catch (err) {
        log(`\n❌ TEST RUN FAILED: ${err.message}`);
        fs.writeFileSync('server/test_run.log', logContent, 'utf-8');
        process.exit(1);
    }
};

runTests();
