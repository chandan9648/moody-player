const express = require("express");
const multer = require("multer");
const uploadFile = require("../service/storage.service.js");
const router = express.Router();
const songModel = require("../models/song.model.js");

const upload = multer({ storage: multer.memoryStorage(),});

router.post("/songs", upload.single("audio"), async(req, res) => {
   console.log(req.body);
   console.log(req.file);
   const fileData = await uploadFile(req.file);

   const song = await songModel.create({
       title: req.body.title,
       artist: req.body.artist,
       audio: fileData.url,
       mood: req.body.mood,
   });

   console.log(fileData);
   res.status(200).json({ message: "Song uploaded successfully",
    song: song,
    
    });
});

router.get('/songs', async(req,res)=>{
     const {mood} = req.query;
     const songs = await songModel.find({
          mood: mood
     })
     res.status(200).json({
          message: 'songs fetched...',
          songs
     })
})

module.exports = router;
