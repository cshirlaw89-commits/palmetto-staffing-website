exports.handler = async function () {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID || "appsKMryvnmEAehrM";
  const tableName = process.env.AIRTABLE_TABLE_NAME || "Open Jobs";

  if (!token) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing AIRTABLE_TOKEN environment variable." })
    };
  }

  const allRecords = [];
  let offset = null;

  try {
    do {
      const params = new URLSearchParams();
      params.set("pageSize", "100");
      if (offset) params.set("offset", offset);

      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          statusCode: response.status,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Airtable request failed",
            details: text,
            baseId,
            tableName
          })
        };
      }

      const data = await response.json();
      allRecords.push(...(data.records || []));
      offset = data.offset;
    } while (offset);

    const openRecords = allRecords.filter(record => {
      const status = String(record.fields["Status"] || "").trim().toLowerCase();
      return status === "" || status === "open";
    });

    const jobs = openRecords.map(record => ({
      id: record.id,
      "Job Title": record.fields["Job Title"] || "",
      "Location": record.fields["Location"] || "",
      "Pay": record.fields["Pay"] || "",
      "Schedule": record.fields["Schedule"] || "",
      "Job Type": record.fields["Job Type"] || "",
      "Description": record.fields["Description"] || "",
      "Requirements": record.fields["Requirements"] || "",
      "Status": record.fields["Status"] || "",
      "Date Posted": record.fields["Date Posted"] || ""
    }));

    jobs.sort((a, b) => {
      const da = new Date(a["Date Posted"] || 0);
      const db = new Date(b["Date Posted"] || 0);
      return db - da;
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
      },
      body: JSON.stringify(jobs)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message, baseId, tableName })
    };
  }
};
