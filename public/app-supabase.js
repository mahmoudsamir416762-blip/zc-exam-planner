/* Browser-to-Supabase lookup adapter. No student index is downloaded by the browser. */
(function () {
  const getConfig = () => window.ZC_CONFIG || {};
  const canonical = (code) => typeof canonicalCourse === "function" ? canonicalCourse(code) : code;

  async function lookup(studentId) {
    const endpoint = getConfig().lookupUrl;
    if (!endpoint || endpoint.includes("YOUR-PROJECT-REF")) {
      throw new Error("The site owner has not configured the Supabase lookup URL yet.");
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Could not look up this university ID.");
    return result.courses || [];
  }

  async function applyLookup(studentId, scope) {
    const courses = await lookup(studentId);
    if (scope === "automatic") {
      selected = [...new Set(courses.map((course) => canonical(course.code)))];
      rooms = Object.fromEntries(courses.map((course) => [canonical(course.code), course.room]));
      mode = "auto";
      render();
      return courses.length;
    }
    rooms = {};
    const allowed = new Set(selected.map(canonical));
    for (const course of courses) {
      const code = canonical(course.code);
      if (allowed.has(code)) rooms[code] = course.room;
    }
    window.zcManualRoomId = studentId;
    render();
    return Object.keys(rooms).length;
  }

  window.zcLookup = async (studentId, scope = "automatic") => {
    const count = await applyLookup(studentId, scope);
    const status = document.getElementById(scope === "automatic" ? "lookupError" : "manualRoomError");
    if (status) status.textContent = scope === "manual" ? `${count} personal room${count === 1 ? "" : "s"} confirmed.` : "";
    return count;
  };

  /* Capture phase replaces the local student-index handler in the published version. */
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("#lookup, #confirmManualRooms");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const automatic = button.id === "lookup";
    const input = document.getElementById(automatic ? "studentId" : "manualRoomId");
    const status = document.getElementById(automatic ? "lookupError" : "manualRoomError");
    const studentId = input.value.trim();
    if (!/^\d{8,9}$/.test(studentId)) {
      status.textContent = "Please enter a valid 8- or 9-digit university ID.";
      return;
    }
    button.disabled = true;
    status.textContent = "Looking up your registered courses…";
    try {
      const count = await window.zcLookup(studentId, automatic ? "automatic" : "manual");
      if (automatic) {
        const save = document.getElementById("saveAuto");
        document.getElementById("saveDash").checked = save.checked;
        if (save.checked) saveSchedule();
      }
      const newStatus = document.getElementById(automatic ? "lookupError" : "manualRoomError");
      if (newStatus) newStatus.textContent = automatic ? "" : `${count} personal room${count === 1 ? "" : "s"} confirmed.`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }, true);
}());
