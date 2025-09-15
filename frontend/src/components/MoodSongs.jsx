import { useEffect, useRef, useState } from "react";

// Accept both `Songs` (existing usage) and `songs` (conventional) to avoid breaking callers
const MoodSongs = ({ Songs, songs: songsProp = [] }) => {
  const songs = Songs ?? songsProp ?? [];

  const [activeIndex, setActiveIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);

  const handlePlayPause = (index) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Toggle pause/resume if clicking the same track
    if (activeIndex === index) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
      return;
    }

    // Switch track
    const nextSrc = songs[index]?.audio || "";
    setActiveIndex(index);
    if (audio.src !== nextSrc) {
      audio.src = nextSrc;
    }
    audio.currentTime = 0; // start from beginning when switching songs
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  // Attach basic audio event handlers and cleanup
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => setIsPlaying(false);
    const onError = () => setIsPlaying(false);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
    };
  }, []);

  // If songs list changes and the active index is out of bounds, reset state
  useEffect(() => {
    if (activeIndex != null && activeIndex >= songs.length) {
      setActiveIndex(null);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs.length]);

  // keep audio element volume in sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
  }, [muted]);

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (muted && val > 0) setMuted(false);
  };

  const toggleMute = () => {
    setMuted((m) => !m);
  };

  return (
    <div className="mood-songs text-zinc-300 flex flex-col items-center  gap-8 mt-10 w-full">
      <h2 className="text-3xl md:text-4xl px-5 py-3 font-bold shadow-lg rounded-full border border-zinc-500 bg-zinc-900 p-4">
        Recommended Songs
      </h2>

      {!songs.length && (
        <p className="text-sm text-zinc-500">No songs to show.</p>
      )}

      <div className="w-full max-w-lg flex flex-col gap-3">
        {songs.map((song, index) => {
          const isActive = activeIndex === index;
          return (
            <div
              className={`song w-full flex items-center justify-between gap-4 rounded-xl border border-zinc-800 px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 transition ${
                isActive ? "ring-2 ring-green-500/50" : ""
              }`}
              key={song?.id ?? `${song?.title ?? "song"}-${index}`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`h-12 w-12 rounded-md bg-gradient-to-br ${
                    isActive
                      ? "from-green-500 to-emerald-600"
                      : "from-zinc-700 to-zinc-800"
                  }`}
                />
                <div className="min-w-0">
                  <h3 className="text-lg truncate">{song.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="truncate">{song.artist}</span>
                    {song.mood && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {song.mood}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Per-song volume/mute controls */}
                <button
                  onClick={toggleMute}
                  disabled={!isActive}
                  className={`p-2 rounded-lg ${
                    muted ? "bg-red-500/20" : "bg-zinc-800 hover:bg-zinc-700"
                  } transition disabled:opacity-40 cursor-pointer`}
                  aria-pressed={muted}
                  aria-label={muted ? "Unmute" : "Mute"}
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted || volume === 0 ? (
                    <i className="ri-volume-mute-line text-xl " />
                  ) : volume < 0.5 ? (
                    <i className="ri-volume-down-line text-xl" />
                  ) : (
                    <i className="ri-volume-up-line text-xl" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={handleVolumeChange}
                  disabled={!isActive}
                  aria-label={`Volume for ${song.title}`}
                  className="w-32 md:w-44 accent-green-500 disabled:opacity-40 cursor-pointer"
                />
                <span className="w-10 text-right text-xs tabular-nums hidden md:block">
                  {Math.round(volume * 100)}%
                </span>

                {/* Play/Pause at the end (right) */}
                <button
                  onClick={() => handlePlayPause(index)}
                  aria-pressed={isActive && isPlaying}
                  aria-label={
                    isActive && isPlaying
                      ? `Pause ${song.title}`
                      : `Play ${song.title}`
                  }
                  className={`p-2 rounded-full cursor-pointer ${
                    isActive && isPlaying
                      ? "bg-green-600/20"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  } transition`}
                >
                  {isActive && isPlaying ? (
                    <i className="ri-pause-circle-fill text-3xl"></i>
                  ) : (
                    <i className="ri-play-circle-fill text-3xl"></i>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Single hidden audio element controlled via ref */}
      <audio ref={audioRef} preload="metadata" style={{ display: "none" }} />
    </div>
  );
};

export default MoodSongs;
