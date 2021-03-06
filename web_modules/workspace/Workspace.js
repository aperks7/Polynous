"use strict";

const Utils = require("../Utils");
const directoryTemplate = require("./templates/directory.hbs");
const fileTemplate = require("./templates/file.hbs");
const textlineTemplate = require("./templates/textline.hbs");

class Workspace
{
  constructor(socketHandler)
  {
    const self = this;
    Object.defineProperties(self,
    {
      id:
      {
        value: window.location.href.substr(window.location.href.lastIndexOf("/") + 1)
      },
      socketHandler:
      {
        value: socketHandler
      },
      directory:
      {
        enumerable: true,
        writable: true,
        value: []
      },
      projectPanel:
      {
        value: document.querySelector(".project-panel")
      },
      editorPanel:
      {
        value: document.querySelector(".editor-panel")
      },
      lines:
      {
        writable: true,
        value: []
      },
      currentFile:
      {
        writable: true,
        value: null
      }
    });

    socketHandler.addHandler("edit", function(data)
    {
      // const fileId = data.fileId;
      const lineIndex = data.lineIndex;
      const lineEdit = data.lineEdit;
      console.log(lineIndex, lineEdit);
      self.lines[lineIndex].innerHTML = lineEdit;
    });
  }

  populate()
  {
    const self = this;
    self.socketHandler.sendCommand("populate",
    {
      id: self.id
    }, function populateCallback(response)
    {
      console.log("populate:", response);
      self.directory = response;
      /* Clearing the div or all previous elements */
      Utils.convertNodeListToArray(self.projectPanel.querySelectorAll(".workspace-item")).forEach(function(node)
      {
        self.projectPanel.removeChild(node);
      });
      const elements = self.generateElements();
      console.log(elements);
      self.projectPanel.appendChild(elements);
    });
  }

  /**
   * clears the editor
   */
  clearEditor()
  {
    const self = this;
    self.editorPanel.innerHTML = "";

  }

  /**
   * Sends edit to the server
   */
  edit(lineIndex, lineEdit)
  {
    const self = this;
    self.lines[lineIndex].innerHTML = lineEdit;
    self.socketHandler.sendCommand("edit",
    {
      id: self.id,
      fileId: self.currentFile,
      lineIndex: lineIndex,
      lineEdit: lineEdit
    }, function editCallback(response)
    {
      console.log(response);
    });

  }

  /**
   * Abandons current file
   */
  abandon(id)
  {
    const self = this;
    self.socketHandler.sendCommand("abandon",
      {
        id: self.id,
        fileId: self.currentFile
      }

    )
  }

  fetch(id)
  {
    const self = this;
    self.currentFile = id;
    self.socketHandler.sendCommand("fetch",
    {
      id: self.id,
      fileId: id
    }, function fetchCallback(response)
    {
      self.clearEditor();
      self.lines = [];
      response.forEach(function(line, index)
      {
        const lineElement = Utils.htmlToElement(textlineTemplate(
        {
          index: index,
          text: line
        }));
        self.lines.push(lineElement);
        self.editorPanel.appendChild(lineElement);
      });
    });
  }

  /**
   * Generates all the elements for the project panel
   */
  generateElements()
  {
    const self = this;

    /* Recursive function for creating the project tree. */
    function generateDirectoryElement(directory, expandedLayers)
    {
      const directoryElement = Utils.htmlToElement(directoryTemplate(
      {
        id: directory.id,
        name: directory.name
      }));
      const itemsElement = directoryElement.querySelector(".workspace-directory-items");
      if (expandedLayers <= 0)
      {
        itemsElement.classList.add("hidden");
      }

      const items = directory.items ? directory.items : [];
      items.forEach(function(item)
      {
        const type = item.type;
        let itemElement = null;
        if (type.toLowerCase() === "directory")
        {
          /* Directory elements */
          itemElement = generateDirectoryElement(item, expandedLayers - 1);
        }
        else
        {
          /* File elements */
          itemElement = Utils.htmlToElement(fileTemplate(item));
          itemElement.addEventListener("click", function(event)
          {
            const fileId = itemElement.dataset.id;
            self.fetch(fileId);
          });
        }

        itemsElement.appendChild(itemElement);
      });

      const nameElement = directoryElement.querySelector(".workspace-directory-name");
      nameElement.addEventListener("click", function toggleDirectoryElement()
      {
        itemsElement.classList.toggle("hidden");
      });

      return directoryElement;

    }
    return generateDirectoryElement(self.directory, 1);
  }
}

module.exports = Workspace;
