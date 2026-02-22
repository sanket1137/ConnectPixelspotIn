import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = 'postgresql://jagpreetsingh@localhost:5432/postgres';

const pool = new Pool({ connectionString: DATABASE_URL });

async function findOrCreateAdmin() {
    const client = await pool.connect();
    try {
        let res = await client.query("SELECT id, name FROM users WHERE role = 'admin' LIMIT 1;");
        if (res.rows[0]) return res.rows[0];

        console.log("No admin found. Creating a default admin...");
        res = await client.query(`
            INSERT INTO users (firebase_uid, email, name, role, status, profile_completed, email_verified, mobile_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name
        `, ['admin-mock-uid', 'admin@pixelspot.in', 'System Admin', 'admin', 'active', true, true, true]);
        return res.rows[0];
    } finally {
        client.release();
    }
}

async function publishBlog(admin) {
    const client = await pool.connect();
    try {
        const blogContent = `
<div class="blog-post-content font-sans leading-relaxed text-slate-800">
    <p class="mb-6">In the rapidly evolving landscape of Indian marketing, one medium continues to stand tall—literally. <strong>Outdoor advertising</strong>, often referred to as <strong>OOH</strong> (Out-of-Home), remains a cornerstone of brand building in India. From the massive <strong>hoarding</strong> structures overlooking the Western Express Highway in Mumbai to the sleek <strong>digital screen</strong> installations in Bangalore’s tech parks, <strong>outdoor advertising</strong> provides a physical presence that digital-only campaigns simply cannot replicate.</p>

    <p class="mb-6">As we move further into 2025, the synergy between traditional <strong>hoarding</strong> aesthetics and modern <strong>DOOH</strong> (Digital Out-of-Home) technology is creating a new era of "unskippable" media. For CMOs and marketing heads, understanding the nuances of the Indian <strong>OOH</strong> market—including <strong>billboard advertising India</strong> trends and <strong>hoarding cost</strong> variations—is essential for executing a successful <strong>outdoor campaign</strong>.</p>

    <h2 class="text-2xl font-bold mt-10 mb-4">Why OOH Remains the King of "Unskippable" Media in India</h2>
    <p class="mb-6">Despite the surge in mobile and social media consumption, <strong>outdoor advertising</strong> has maintained its dominance because it cannot be blocked or skipped. A strategic <strong>hoarding</strong> placed at a high-traffic junction in Delhi or a <strong>digital screen</strong> in a premium shopping mall in Gurgaon demands attention.</p>
    
    <p class="mb-6">The traditional <strong>hoarding</strong> is no longer just a static board; it is a landmark. In India, <strong>outdoor advertising</strong> serves as a high-frequency touchpoint for commuters. Whether it’s a standard <strong>billboard advertising India</strong> format or a specialized <strong>LED screen advertising</strong> setup, the sheer scale of <strong>OOH</strong> creates a psychological impact of "bigness" and trust.</p>

    <h2 class="text-2xl font-bold mt-10 mb-4">From Static to Dynamic: The Rise of the Digital Hoarding</h2>
    <p class="mb-6">The biggest shift in the industry is the transition from the static <strong>hoarding</strong> to the <strong>digital hoarding</strong>. This evolution, collectively known as <strong>DOOH</strong>, allows brands to move beyond a single creative. A <strong>digital hoarding</strong> in Bangalore can now display multiple messages based on the time of day, weather, or even real-time traffic conditions.</p>

    <h3 class="text-xl font-bold mt-8 mb-3">The Power of LED Screen Advertising in Urban Hubs</h3>
    <p class="mb-6">The core of this transition is <strong>LED screen advertising</strong>. These high-brightness <strong>digital screen</strong> units bring vibrant, video-quality content to the streets. Unlike a vinyl-printed <strong>hoarding</strong>, a <strong>digital screen</strong> allows for motion graphics, content flexibility, and <strong>Programmatic DOOH</strong> integration.</p>

    <h2 class="text-2xl font-bold mt-10 mb-4">Navigating Billboard & Hoarding Cost India: Budgeting for Success</h2>
    <p class="mb-6">Pricing in <strong>outdoor advertising</strong> is highly localized. Factors include location tier, format (vinyl vs <strong>digital screen</strong>), and visibility metrics. On average, an <strong>outdoor campaign</strong> in India can range from a few lakhs for a local <strong>hoarding</strong> to several crores for a multi-city <strong>OOH</strong> blitz.</p>

    <h2 class="text-2xl font-bold mt-10 mb-4">Regional Focus: Outdoor Ads Mumbai vs. Digital Hoardings Bangalore</h2>
    <p class="mb-6">Mumbai is the capital of <strong>hoarding</strong> culture. The city’s geography makes it a linear corridor with premium <strong>hoarding</strong> sites. Bangalore, however, is the hub of <strong>DOOH</strong> innovation, with extensive <strong>digital hoardings Bangalore</strong> networks in tech parks.</p>

    <h2 class="text-2xl font-bold mt-10 mb-4">Comparison: OOH vs. DOOH vs. Digital Ads</h2>
    <div class="overflow-x-auto my-8">
        <table class="w-full border-collapse">
            <thead>
                <tr class="bg-slate-100">
                    <th class="border p-3 text-left">Feature</th>
                    <th class="border p-3 text-left">Traditional OOH (Hoarding)</th>
                    <th class="border p-3 text-left">Digital OOH (DOOH)</th>
                    <th class="border p-3 text-left">Digital Ads (Mobile/Web)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="border p-3 font-bold">Visibility</td>
                    <td class="border p-3">Forced (Unskippable)</td>
                    <td class="border p-3">Forced (Unskippable)</td>
                    <td class="border p-3">High (But easy to skip)</td>
                </tr>
                <tr>
                    <td class="border p-3 font-bold">Material</td>
                    <td class="border p-3">Vinyl/Static Board</td>
                    <td class="border p-3">Digital Screen/LED</td>
                    <td class="border p-3">Pixels on Personal Devices</td>
                </tr>
                <tr>
                    <td class="border p-3 font-bold">Flexibility</td>
                    <td class="border p-3">Low</td>
                    <td class="border p-3">High</td>
                    <td class="border p-3">Infinite</td>
                </tr>
            </tbody>
        </table>
    </div>

    <h2 class="text-2xl font-bold mt-10 mb-4">Conclusion</h2>
    <p class="mb-6">The power of the <strong>hoarding</strong> has never been more relevant than it is in 2025. By blending the tradition of <strong>OOH</strong> with the innovation of <strong>DOOH</strong> and <strong>digital screen</strong> technology, brands in India can achieve unmatched visibility. At Pixelspot, we specialize in making your <strong>OOH</strong> vision a reality through India's smartest <strong>digital hoarding</strong> network.</p>

    <div class="bg-slate-50 p-8 rounded-xl border border-slate-200 mt-12">
        <h3 class="text-xl font-bold mb-6">Frequently Asked Questions (FAQ)</h3>
        <dl class="space-y-4">
            <dt class="font-bold">1. What is the difference between OOH and DOOH?</dt>
            <dd class="text-slate-600 mb-4">OOH is all outdoor, DOOH is digital outdoor.</dd>
            
            <dt class="font-bold">2. How much does a hoarding cost in India?</dt>
            <dd class="text-slate-600 mb-4">Varies by location and format.</dd>
            
            <dt class="font-bold">3. Why choose digital hoarding?</dt>
            <dd class="text-slate-600 mb-4">Flexibility and dynamic content.</dd>
            <dt class="font-bold">4. What is hyperlocal outdoor advertising?</dt>
            <dd class="text-slate-600 mb-4">Targeted area-specific campaigns.</dd>
            <dt class="font-bold">5. Are LED screens effective?</dt>
            <dd class="text-slate-600 mb-4">Yes, high attention capture.</dd>
            <dt class="font-bold">6. How to measure success?</dt>
            <dd class="text-slate-600 mb-4">Traffic data and AI analytics.</dd>
        </dl>
    </div>
</div>
        `;

        const query = {
            text: 'INSERT INTO blogs(title, slug, content, excerpt, author_id, cover_image, status, created_at, updated_at) VALUES($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id, slug',
            values: [
                "The Ultimate Guide to Hoarding, OOH, and Outdoor Advertising in India",
                "ultimate-guide-hoarding-ooh-outdoor-advertising-india",
                blogContent.trim(),
                "Master OOH and outdoor advertising in India. Explore hoarding costs, digital screen benefits, and DOOH strategies in Mumbai, Bangalore & Delhi.",
                admin.id,
                "https://images.unsplash.com/photo-1541535650810-10d26f5c2abb?auto=format&fit=crop&q=80&w=1000",
                "published"
            ],
        };

        const res = await client.query(query);
        console.log(`Successfully published blog! ID: ${res.rows[0].id}, Slug: ${res.rows[0].slug}`);
    } finally {
        client.release();
    }
}

async function main() {
    try {
        const admin = await findOrCreateAdmin();
        if (!admin) {
            console.error("No admin user found or created!");
            return;
        }
        console.log(`Using admin: ${admin.name} (${admin.id})`);
        await publishBlog(admin);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

main();
