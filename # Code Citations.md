# Code Citations

## License: unknown
https://github.com/AnkitaSachan02/ServerGuyTest/blob/b038b412d5f23bd3268734019a4bdc6d80ce4a4f/gitui/src/pages/login.js

```
Sempurna! ✅ Saya sudah memperbaiki masalah infinite redirect loop dan mengupdate sesuai keinginan Anda. Berikut yang sudah diubah:

## ✅ **Perubahan yang Dilakukan**

### **1. Fix Redirect Loop Issue** 🔄
**Masalah:** Ada script auto-login yang terus redirect jika sudah ada role di sessionStorage  
**Solusi:**
- Hapus script auto-login di `index.html` 
- Tambah flag `isCheckingAccess` untuk prevent multiple redirect checks
- Gunakan `setTimeout()` untuk delay redirect setelah login
- Tambah `auth` parameter dengan timestamp untuk unique redirect

### **2. Hapus Dropdown Role** 🚫
- ✅ Role sudah tidak bisa dipilih dari frontend
- ✅ Role ditentukan dari backend (via test account credentials)
- ✅ User hanya input Engineer ID & Password

### **3. Tambah 4 Test Accounts** 👥
```
📋 TEST ACCOUNTS (untuk development):

1. budi     / password123  → Admin (Full Access)
2. siti     / password123  → Manager (Overview + Vehicles)
3. rudi     / password123  → PH-H2 Team (Hydrogen Vehicle Only)
4. andi     / password123  → UC-BE Team (Electric Vehicle Only)
```

Semua test accounts sudah ditampilkan di login page untuk memudahkan testing.

### **4. Update Login Form** 📝
- Placeholder berubah menjadi: `Try: budi, siti, rudi, andi` dan `Use: password123`
- Button berubah dari "INITIALIZE SESSION" → `LOGIN`
- Tambah info box dengan list semua test accounts

---

## 🚀 **Cara Testing**

1. **Buka login page:** `index.html`

2. **Coba login dengan test account:**
   ```
   Engineer ID: budi
   Password:    password123
   → Auto redirect ke OVERVIEW (Admin access)
   ```

3. **Atau coba akun lain:**
   ```
   Engineer ID: rudi
   Password:    password123
   → Auto redirect ke PH-H2 page (Hydrogen vehicle only)
   ```

---

## 📋 **Test Account Mapping**

| Engineer ID | Password | Role | Redirect Page |
|-------------|----------|------|---------------|
| **budi** | password123 | Admin | `overview.html` |
| **siti** | password123 | Manager | `overview.html` |
| **rudi** | password123 | PH-H2 Team | `ph-h2.html` |
| **andi** | password123 | UC-BE Team | `uc-be.html` |

---

## 🔧 **Production Implementation**

Ketika siap production, replace test account logic dengan actual API call:

```javascript
// Dalam js/auth.js - handleLogin() function

// Ganti bagian ini:
if (TEST_ACCOUNTS[username] && TEST_ACCOUNTS[username].password === password) {

// Dengan API call:
fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
})
.then(res => res.json())
.then(data => {
    if (data.success) {
        setUserRole(data.role);
        setUserEmail(data.email);
        const redirectPage = ROLE_PAGE_MAP[data.role];
        window.location.href = redirectPage + '?auth=' + Date.now();
    }
});
```

---

## 
```


## License: MIT
https://github.com/pqmcgill/stamp-wedding-app/blob/b09d6f7146aa16211b59c28be4f6ee8eedb2d2ac/client/src/actions/user/index.js

```
Sempurna! ✅ Saya sudah memperbaiki masalah infinite redirect loop dan mengupdate sesuai keinginan Anda. Berikut yang sudah diubah:

## ✅ **Perubahan yang Dilakukan**

### **1. Fix Redirect Loop Issue** 🔄
**Masalah:** Ada script auto-login yang terus redirect jika sudah ada role di sessionStorage  
**Solusi:**
- Hapus script auto-login di `index.html` 
- Tambah flag `isCheckingAccess` untuk prevent multiple redirect checks
- Gunakan `setTimeout()` untuk delay redirect setelah login
- Tambah `auth` parameter dengan timestamp untuk unique redirect

### **2. Hapus Dropdown Role** 🚫
- ✅ Role sudah tidak bisa dipilih dari frontend
- ✅ Role ditentukan dari backend (via test account credentials)
- ✅ User hanya input Engineer ID & Password

### **3. Tambah 4 Test Accounts** 👥
```
📋 TEST ACCOUNTS (untuk development):

1. budi     / password123  → Admin (Full Access)
2. siti     / password123  → Manager (Overview + Vehicles)
3. rudi     / password123  → PH-H2 Team (Hydrogen Vehicle Only)
4. andi     / password123  → UC-BE Team (Electric Vehicle Only)
```

Semua test accounts sudah ditampilkan di login page untuk memudahkan testing.

### **4. Update Login Form** 📝
- Placeholder berubah menjadi: `Try: budi, siti, rudi, andi` dan `Use: password123`
- Button berubah dari "INITIALIZE SESSION" → `LOGIN`
- Tambah info box dengan list semua test accounts

---

## 🚀 **Cara Testing**

1. **Buka login page:** `index.html`

2. **Coba login dengan test account:**
   ```
   Engineer ID: budi
   Password:    password123
   → Auto redirect ke OVERVIEW (Admin access)
   ```

3. **Atau coba akun lain:**
   ```
   Engineer ID: rudi
   Password:    password123
   → Auto redirect ke PH-H2 page (Hydrogen vehicle only)
   ```

---

## 📋 **Test Account Mapping**

| Engineer ID | Password | Role | Redirect Page |
|-------------|----------|------|---------------|
| **budi** | password123 | Admin | `overview.html` |
| **siti** | password123 | Manager | `overview.html` |
| **rudi** | password123 | PH-H2 Team | `ph-h2.html` |
| **andi** | password123 | UC-BE Team | `uc-be.html` |

---

## 🔧 **Production Implementation**

Ketika siap production, replace test account logic dengan actual API call:

```javascript
// Dalam js/auth.js - handleLogin() function

// Ganti bagian ini:
if (TEST_ACCOUNTS[username] && TEST_ACCOUNTS[username].password === password) {

// Dengan API call:
fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
})
.then(res => res.json())
.then(data => {
    if (data.success) {
        setUserRole(data.role);
        setUserEmail(data.email);
        const redirectPage = ROLE_PAGE_MAP[data.role];
        window.location.href = redirectPage + '?auth=' + Date.now();
    }
});
```

---

## ✨ **Keuntungan Perubahan**

✅ **Tidak ada infinite redirect loop** - Fixed dengan flag dan setTimeout  
```


## License: unknown
https://github.com/AnkitaSachan02/ServerGuyTest/blob/b038b412d5f23bd3268734019a4bdc6d80ce4a4f/gitui/src/pages/login.js

```
Sempurna! ✅ Saya sudah memperbaiki masalah infinite redirect loop dan mengupdate sesuai keinginan Anda. Berikut yang sudah diubah:

## ✅ **Perubahan yang Dilakukan**

### **1. Fix Redirect Loop Issue** 🔄
**Masalah:** Ada script auto-login yang terus redirect jika sudah ada role di sessionStorage  
**Solusi:**
- Hapus script auto-login di `index.html` 
- Tambah flag `isCheckingAccess` untuk prevent multiple redirect checks
- Gunakan `setTimeout()` untuk delay redirect setelah login
- Tambah `auth` parameter dengan timestamp untuk unique redirect

### **2. Hapus Dropdown Role** 🚫
- ✅ Role sudah tidak bisa dipilih dari frontend
- ✅ Role ditentukan dari backend (via test account credentials)
- ✅ User hanya input Engineer ID & Password

### **3. Tambah 4 Test Accounts** 👥
```
📋 TEST ACCOUNTS (untuk development):

1. budi     / password123  → Admin (Full Access)
2. siti     / password123  → Manager (Overview + Vehicles)
3. rudi     / password123  → PH-H2 Team (Hydrogen Vehicle Only)
4. andi     / password123  → UC-BE Team (Electric Vehicle Only)
```

Semua test accounts sudah ditampilkan di login page untuk memudahkan testing.

### **4. Update Login Form** 📝
- Placeholder berubah menjadi: `Try: budi, siti, rudi, andi` dan `Use: password123`
- Button berubah dari "INITIALIZE SESSION" → `LOGIN`
- Tambah info box dengan list semua test accounts

---

## 🚀 **Cara Testing**

1. **Buka login page:** `index.html`

2. **Coba login dengan test account:**
   ```
   Engineer ID: budi
   Password:    password123
   → Auto redirect ke OVERVIEW (Admin access)
   ```

3. **Atau coba akun lain:**
   ```
   Engineer ID: rudi
   Password:    password123
   → Auto redirect ke PH-H2 page (Hydrogen vehicle only)
   ```

---

## 📋 **Test Account Mapping**

| Engineer ID | Password | Role | Redirect Page |
|-------------|----------|------|---------------|
| **budi** | password123 | Admin | `overview.html` |
| **siti** | password123 | Manager | `overview.html` |
| **rudi** | password123 | PH-H2 Team | `ph-h2.html` |
| **andi** | password123 | UC-BE Team | `uc-be.html` |

---

## 🔧 **Production Implementation**

Ketika siap production, replace test account logic dengan actual API call:

```javascript
// Dalam js/auth.js - handleLogin() function

// Ganti bagian ini:
if (TEST_ACCOUNTS[username] && TEST_ACCOUNTS[username].password === password) {

// Dengan API call:
fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
})
.then(res => res.json())
.then(data => {
    if (data.success) {
        setUserRole(data.role);
        setUserEmail(data.email);
        const redirectPage = ROLE_PAGE_MAP[data.role];
        window.location.href = redirectPage + '?auth=' + Date.now();
    }
});
```

---

## 
```


## License: MIT
https://github.com/pqmcgill/stamp-wedding-app/blob/b09d6f7146aa16211b59c28be4f6ee8eedb2d2ac/client/src/actions/user/index.js

```
Sempurna! ✅ Saya sudah memperbaiki masalah infinite redirect loop dan mengupdate sesuai keinginan Anda. Berikut yang sudah diubah:

## ✅ **Perubahan yang Dilakukan**

### **1. Fix Redirect Loop Issue** 🔄
**Masalah:** Ada script auto-login yang terus redirect jika sudah ada role di sessionStorage  
**Solusi:**
- Hapus script auto-login di `index.html` 
- Tambah flag `isCheckingAccess` untuk prevent multiple redirect checks
- Gunakan `setTimeout()` untuk delay redirect setelah login
- Tambah `auth` parameter dengan timestamp untuk unique redirect

### **2. Hapus Dropdown Role** 🚫
- ✅ Role sudah tidak bisa dipilih dari frontend
- ✅ Role ditentukan dari backend (via test account credentials)
- ✅ User hanya input Engineer ID & Password

### **3. Tambah 4 Test Accounts** 👥
```
📋 TEST ACCOUNTS (untuk development):

1. budi     / password123  → Admin (Full Access)
2. siti     / password123  → Manager (Overview + Vehicles)
3. rudi     / password123  → PH-H2 Team (Hydrogen Vehicle Only)
4. andi     / password123  → UC-BE Team (Electric Vehicle Only)
```

Semua test accounts sudah ditampilkan di login page untuk memudahkan testing.

### **4. Update Login Form** 📝
- Placeholder berubah menjadi: `Try: budi, siti, rudi, andi` dan `Use: password123`
- Button berubah dari "INITIALIZE SESSION" → `LOGIN`
- Tambah info box dengan list semua test accounts

---

## 🚀 **Cara Testing**

1. **Buka login page:** `index.html`

2. **Coba login dengan test account:**
   ```
   Engineer ID: budi
   Password:    password123
   → Auto redirect ke OVERVIEW (Admin access)
   ```

3. **Atau coba akun lain:**
   ```
   Engineer ID: rudi
   Password:    password123
   → Auto redirect ke PH-H2 page (Hydrogen vehicle only)
   ```

---

## 📋 **Test Account Mapping**

| Engineer ID | Password | Role | Redirect Page |
|-------------|----------|------|---------------|
| **budi** | password123 | Admin | `overview.html` |
| **siti** | password123 | Manager | `overview.html` |
| **rudi** | password123 | PH-H2 Team | `ph-h2.html` |
| **andi** | password123 | UC-BE Team | `uc-be.html` |

---

## 🔧 **Production Implementation**

Ketika siap production, replace test account logic dengan actual API call:

```javascript
// Dalam js/auth.js - handleLogin() function

// Ganti bagian ini:
if (TEST_ACCOUNTS[username] && TEST_ACCOUNTS[username].password === password) {

// Dengan API call:
fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
})
.then(res => res.json())
.then(data => {
    if (data.success) {
        setUserRole(data.role);
        setUserEmail(data.email);
        const redirectPage = ROLE_PAGE_MAP[data.role];
        window.location.href = redirectPage + '?auth=' + Date.now();
    }
});
```

---

## ✨ **Keuntungan Perubahan**

✅ **Tidak ada infinite redirect loop** - Fixed dengan flag dan setTimeout  
```

