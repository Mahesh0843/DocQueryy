const mongoose = require("mongoose");
const Document = require("../models/Document");
const getEmbedding = require("../services/embeddingService");
const generateAnswer = require("../services/aiService");
const ChatHistory = require("../models/ChatHistory");

exports.queryRAG = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const queryVector = await getEmbedding(query);

    const userId = new mongoose.Types.ObjectId(req.user._id);

    const results = await Document.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryVector,
          numCandidates: 150,  // Increased to account for filtering
          limit: 20
        }
      },
      {
        $match: {
          userId: userId  // Filter after vector search
        }
      },
      {
        $limit: 5  // Final limit after filtering
      },
      {
        $project: {
          content: 1,
          filename: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]);

    if (results.length === 0) {
      await ChatHistory.create({
        userId: req.user._id,
        question: query,
        answer: "No relevant information found in your uploaded documents.",
        references: [],
      });
      
      return res.json({
        answer: "No relevant information found in your uploaded documents.",
        references: []
      });
    }

    const context = results
      .map(r => `File: ${r.filename}\nContent: ${r.content}`)
      .join("\n\n");

    const prompt = `
      Context from user's documents:
      ${context}
      
      User's question: ${query}
      
      Answer the question using ONLY the provided context.
      If the information is not in the context, say: "I cannot find that information in your documents."
      
      Provide a clear, concise answer based on the context.
    `;

    const answer = await generateAnswer(prompt);

    await ChatHistory.create({
      userId: req.user._id,
      question: query,
      answer,
      references: results,
    });

    res.json({ 
      success: true,
      answer, 
      references: results 
    });
    
  } catch (err) {
    console.error("RAG Query error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};