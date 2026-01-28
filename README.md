# Mining Stakeholder Simulation

A multi-role decision support tool for simulating negotiations between a **Mining Developer** and a **Community Group**, overseen by an **Administrator**.

## 🚀 Live Access
**URL**: [https://caseres-mining-simulation.vercel.app/](https://caseres-mining-simulation.vercel.app/)

---

## 🔑 Access Codes (PINs)
To ensure role separation, each interface is protected by a PIN code.

| Role | PIN | Description |
|---|---|---|
| **Community Group** | *(Provided by Admin)* | Selects mine size preference, "Areas to Avoid", and "Community Benefits". |
| **Mining Developer** | *(Provided by Admin)* | Configures mine capacity/size and allocates R&D budget for environmental mitigation. |
| **Administrator** | *(Provided by Admin)* | Uploads results from both groups to assess feasibility and conflicts. |

> **How to Change PINs:**
> 1. Open `src/App.tsx`.
> 2. Locate the `handlePinSubmit` function (~line 18).
> 3. Edit the code to set your own secure PINs.
> 4. Commit and push changes to update the live site.

---

## 🎮 Simulation Workflow

### 1. Community Group (`1234`)
*   **Goal**: Maximize unlocked benefits while protecting critical areas.
*   **Matrix**: Vote (0-5) on preferences for 5 Mine Size Scenarios.
*   **Benefits**: Larger mines unlock more benefits (Canoe, Irrigation, etc.).
*   **Output**: Downloads `community_results.csv`.

### 2. Mining Developer (`5678`)
*   **Goal**: Maximize production while meeting environmental standards.
*   **Step 1 (Config)**: Select **Mine Size** (Waste Baseline) and **Capacity** (Water Baseline).
    *   *Logic*: Total Budget = ($1.5M \times \text{Size}$) + ($1.5 \times \text{Capacity}$).
*   **Step 2 (Allocation)**: Use slider to split budget between **Water Mitigation** and **Waste Management**.
    *   *Math*: $Value_{final} = Baseline \times (0.2 + 0.8 \times e^{-0.5 \times Budget})$.
*   **Output**: Downloads `mining_simulation_results.csv`.

### 3. Administrator (`5555`)
*   **Action**: Upload both CSV files.
*   **Logic Check**:
    1.  **Water Constraint**: If Community wants *Canoe/Irrigation*, Mining Water must be **$\le$ 800,000 m³**.
    2.  **Waste Constraint**: If Community wants *Park/Energy*, Mining Waste must be **$\le$ 5,000,000 tons**.
    3.  **Size Consensus**: Checks if both parties aimed for a similar Mine Size (Gap $\le$ 2 steps).
    4.  **Benefit Funding**: Verifies if Developer budget covers all requested Community benefits.
*   **Negotiation Dashboard**:
    *   **Scatter Plot**: Visualizes all 41 possible Community Benefit combinations (Cost vs Utility).
    *   **Community Choice**: Marks the specific combination chosen by the community (Red Star).
    *   **Developer Budget**: Displays the Miner's R&D budget limit (Green Dashed Line).
*   **Result**: Displays **Optimal** (Green), **Suboptimal** (Yellow), or **Infeasible** (Red).

---

## 🛠️ Technical Maintenance

### Running Locally
```bash
git clone https://github.com/YOUR_USERNAME/caseras-negotiation-app.git
cd caseras-negotiation-app
npm install
npm run dev
```

### Updating the Site
The site is hosted on **Vercel** and connected to the GitHub repository.
1.  Make changes to the code locally.
2.  Push to the `main` branch:
    ```bash
    git add .
    git commit -m "Description of change"
    git push origin main
    ```
3.  Vercel will automatically detect the push and redeploy the site within 1-2 minutes.

### Troubleshooting
*   **"Infeasible" Result?** The Developer likely needs to allocate more budget to the specific constraint (Water or Waste) requested by the Community benefits.
*   **CSV Error?** Ensure users do not rename or modify the CSV files before uploading.
