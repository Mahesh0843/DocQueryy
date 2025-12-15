
// UPLOAD DOCUMENT
const pdfParse = require("pdf-parse");
const Document = require("../models/Document");
const getEmbedding = require("../services/embeddingService");
const chunkText = require("../services/chunkService");

// UPLOAD DOCUMENT
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let text = "";

    // PDF handling
    if (req.file.mimetype === "application/pdf") {
      const pdfData = await pdfParse(req.file.buffer);
      text = pdfData.text || "";
    }
    // Text file handling
    else if (
      req.file.mimetype.includes("text") ||
      /\.(txt|md|html)$/i.test(req.file.originalname)
    ) {
      text = req.file.buffer.toString("utf8");
    } else {
      return res
        .status(400)
        .json({ error: "Only PDF, TXT, MD, HTML files accepted" });
    }

    // Check extracted text
    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ error: "Unable to extract text from uploaded file" });
    }

    // Chunk text
    const chunks = chunkText(text);

    // Prepare documents
    const docs = [];
    for (const chunk of chunks) {
      const emb = await getEmbedding(chunk);

      docs.push({
        userId: req.user._id,
        filename: req.file.originalname,
        content: chunk,
        embedding: emb
      });
    }

    // Insert into MongoDB
    await Document.insertMany(docs);

    return res.json({
      success: true,
      message: "Document uploaded successfully",
      filename: req.file.originalname,
      chunks: docs.length
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
};
// LIST DOCUMENTS
exports.listDocuments = async (req, res) => {
  try {
    const files = await Document.distinct("filename", {
      userId: req.user._id,
    });

    // Get additional document information
    const documents = await Document.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: "$filename",
          chunks: { $sum: 1 },
          lastUploaded: { $max: "$uploadedAt" },
          mimetype: { $first: "$mimetype" }
        }
      },
      {
        $project: {
          filename: "$_id",
          chunks: 1,
          lastUploaded: 1,
          mimetype: 1,
          _id: 0
        }
      },
      { $sort: { lastUploaded: -1 } }
    ]);

    res.json(documents);
  } catch (err) {
    console.error("List documents error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET DOCUMENT CHUNKS
exports.getDocumentChunks = async (req, res) => {
  try {
    const { filename } = req.params;
    
    const chunks = await Document.find(
      { 
        userId: req.user._id,
        filename: filename 
      },
      { 
        content: 1,
        _id: 0,
        uploadedAt: 1 
      }
    ).sort({ _id: 1 });

    res.json({
      filename,
      totalChunks: chunks.length,
      chunks: chunks.map((chunk, index) => ({
        chunkNumber: index + 1,
        content: chunk.content,
        uploadedAt: chunk.uploadedAt
      }))
    });
  } catch (err) {
    console.error("Get document chunks error:", err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE DOCUMENT
exports.deleteDocument = async (req, res) => {
  try {
    const { filename } = req.params;
    
    const result = await Document.deleteMany({
      userId: req.user._id,
      filename: filename
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({ 
      message: "Document deleted successfully",
      deletedChunks: result.deletedCount,
      filename: filename
    });
  } catch (err) {
    console.error("Delete document error:", err);
    res.status(500).json({ error: err.message });
  }
};

// SEARCH DOCUMENTS
exports.searchDocuments = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Get embedding for the search query
    const queryEmbedding = await getEmbedding(query.trim());
    
    // Find similar documents using vector search
    // Note: This assumes your MongoDB has vector search capabilities
    // You might need to adjust this based on your database setup
    const similarChunks = await Document.aggregate([
      {
        $match: {
          userId: req.user._id
        }
      },
      {
        $addFields: {
          similarity: {
            $let: {
              vars: {
                dotProduct: { $dotProduct: ["$embedding", queryEmbedding] },
                magnitudeA: { $sqrt: { $sum: { $map: { input: "$embedding", as: "a", in: { $pow: ["$$a", 2] } } } } },
                magnitudeB: { $sqrt: { $sum: { $map: { input: queryEmbedding, as: "b", in: { $pow: ["$$b", 2] } } } } }
              },
              in: { $divide: ["$$dotProduct", { $multiply: ["$$magnitudeA", "$$magnitudeB"] }] }
            }
          }
        }
      },
      {
        $match: {
          similarity: { $gt: 0.7 } // Adjust threshold as needed
        }
      },
      {
        $sort: { similarity: -1 }
      },
      {
        $limit: 10 // Limit results
      },
      {
        $project: {
          filename: 1,
          content: 1,
          similarity: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      query: query.trim(),
      results: similarChunks.length,
      chunks: similarChunks
    });
  } catch (err) {
    console.error("Search documents error:", err);
    res.status(500).json({ error: err.message });
  }
};