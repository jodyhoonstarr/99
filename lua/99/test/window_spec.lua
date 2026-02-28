-- luacheck: globals describe it assert before_each after_each
local Window = require("99.window")
local eq = assert.are.same

describe("Window", function()
  local previous_list_uis

  before_each(function()
    previous_list_uis = vim.api.nvim_list_uis
    vim.api.nvim_list_uis = function()
      return {
        { width = 120, height = 40 },
      }
    end
  end)

  after_each(function()
    vim.api.nvim_list_uis = previous_list_uis
    Window.clear_active_popups()
  end)

  it("shows keymap legend window and applies keyoffset", function()
    local win = Window.capture_input("Prompt", {
      cb = function() end,
      keymap = {
        q = "cancel",
        ["<CR>"] = "submit",
      },
    })

    eq(2, #Window.active_windows)
    eq(2, vim.wo[win.win_id].scrolloff)

    local legend = Window.active_windows[2]
    local lines = vim.api.nvim_buf_get_lines(legend.buf_id, 0, -1, false)
    eq({ "<CR>=submit", "q=cancel" }, lines)
  end)
end)
